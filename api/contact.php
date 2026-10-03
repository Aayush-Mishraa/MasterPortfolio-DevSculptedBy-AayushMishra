<?php

declare(strict_types=1);

/*
 * POST /api/contact.php: the contact form.
 *
 * Order of checks: method, origin, body size and type, honeypot, form token,
 * per-IP rate limit, field validation. Then the lead is saved (leads table)
 * and emailed to MAIL_TO with Reply-To set to the sender. Either one is
 * enough to report success; if both fail the page offers email instead.
 */

use Site\ContactOptions;
use Site\Db;
use Site\FormToken;
use Site\Http;
use Site\Mailer;
use Site\RateLimit;
use Site\Validator;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('POST');
Http::requireAllowedOrigin($config);
$input = Http::readJson(16384);

// Honeypot: a field people never see. A bot that fills it gets a quiet "ok".
if (trim((string) ($input['website'] ?? '')) !== '') {
    error_log('[api] contact: honeypot filled, dropped');
    Http::json(200, ['ok' => true, 'delivered' => true]);
}

$token = (new FormToken($config))->verify((string) ($input['token'] ?? ''), 'contact');
if (!$token['valid']) {
    if ($token['reason'] === 'too_new') {
        Http::error(429, 'too_fast', 'One moment…', ['retry_after' => $token['wait']]);
    }
    Http::error(403, 'invalid_token', 'This form expired. Please send it again.');
}

$ip = Http::clientIp($config);
$ipHash = Http::ipHash($config, $ip);
$pdo = $config->hasDatabase() ? Db::tryConnect($config) : null;
$limit = (new RateLimit($config, $pdo))->hit('contact', $ipHash, [600 => 3, 86400 => 10]);
if (!$limit['allowed']) {
    $minutes = max(1, (int) ceil($limit['retry_after'] / 60));
    Http::error(429, 'rate_limited', "You've sent a few messages already. Please try again in {$minutes} minute" . ($minutes === 1 ? '' : 's') . ', or email me directly.', [
        'retry_after' => $limit['retry_after'],
    ]);
}

$validator = new Validator($input);
$intent = $validator->oneOf('intent', array_keys(ContactOptions::INTENTS), 'reason', 'hello');
$topics = $validator->listOf('topics', array_keys(ContactOptions::TOPICS), count(ContactOptions::TOPICS), 'topics');
$name = $validator->text('name', 1, 100, 'Your name');
$email = $validator->email('email');
$company = $validator->text('company', 0, 120, 'Company');
$timeline = $validator->oneOf('timeline', ContactOptions::TIMELINES, 'timeline');
$message = $validator->text('message', 20, 5000, 'The message', true);
$page = $validator->text('page', 0, 200, 'Page');
$source = $validator->oneOf('source', ContactOptions::SOURCES, 'source', 'contact');
if ($validator->fails()) {
    Http::error(422, 'invalid', 'Please check the highlighted fields.', ['fields' => $validator->errors()]);
}

$intentLabel = ContactOptions::INTENTS[$intent] ?? 'Message';
$topicLabels = array_map(static fn ($id) => ContactOptions::TOPICS[$id], $topics);
$userAgent = mb_substr(Validator::clean($_SERVER['HTTP_USER_AGENT'] ?? '', false), 0, 255);
$now = gmdate('Y-m-d H:i:s');

// 1. Save the lead.
$leadId = null;
if ($pdo !== null) {
    try {
        $pdo->prepare(
            'INSERT INTO leads (created_at, source, intent, name, email, company, timeline, topics, message, page, ip_hash, user_agent)
             VALUES (:created_at, :source, :intent, :name, :email, :company, :timeline, :topics, :message, :page, :ip_hash, :user_agent)'
        )->execute([
            'created_at' => $now,
            'source' => $source,
            'intent' => $intent,
            'name' => $name,
            'email' => $email,
            'company' => $company !== '' ? $company : null,
            'timeline' => $timeline,
            'topics' => $topics ? implode(',', $topics) : null,
            'message' => $message,
            'page' => $page !== '' ? $page : null,
            'ip_hash' => $ipHash,
            'user_agent' => $userAgent !== '' ? $userAgent : null,
        ]);
        $leadId = (int) $pdo->lastInsertId();
    } catch (Throwable $error) {
        error_log('[api] contact: could not save the lead: ' . $error->getMessage());
    }
}

// 2. Email it.
$lines = [
    $message,
    '',
    '—',
    "Name:     {$name}",
    "Email:    {$email}",
];
if ($company !== '') {
    $lines[] = "Company:  {$company}";
}
$lines[] = "Reason:   {$intentLabel}";
if ($topicLabels) {
    $lines[] = 'Topics:   ' . implode(', ', $topicLabels);
}
if ($timeline !== null) {
    $lines[] = "Timeline: {$timeline}";
}
$lines[] = '';
$lines[] = 'Sent from ' . ($source === 'footer' ? 'the footer' : 'the contact page') . ' on aayushmishra.engineer'
    . ($page !== '' ? " ({$page})" : '') . ' at ' . gmdate('j M Y, H:i') . ' UTC'
    . ($leadId ? " · lead #{$leadId}" : '') . '.';
$lines[] = 'Reply to this email to answer ' . $name . ' directly.';

$subject = "[{$intentLabel}] {$name}" . ($company !== '' ? " · {$company}" : '');
$mailer = new Mailer($config);
$mailed = $mailer->configured() && $mailer->send($config->string('mail_to'), $subject, implode("\n", $lines), [
    'reply_to' => $email,
    'reply_name' => $name,
    'headers' => ['X-Site-Lead' => $leadId ? (string) $leadId : 'unsaved'],
]);

if ($leadId && $mailed && $pdo !== null) {
    try {
        $pdo->prepare('UPDATE leads SET mail_sent = 1 WHERE id = :id')->execute(['id' => $leadId]);
    } catch (Throwable $error) {
        // the flag is informational
    }
}

if (!$leadId && !$mailed) {
    Http::error(503, 'unavailable', "The message couldn't be delivered from here. Please email it instead.", ['fallback' => 'mailto']);
}

// No lead id in the reply: a sequential number would tell anyone how many leads arrive.
Http::json(200, ['ok' => true, 'delivered' => $mailed]);
