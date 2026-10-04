<?php

declare(strict_types=1);

/*
 * POST /api/enquiry.php: the enquiry form on each /services/<slug> page (F12).
 *
 * Same checks as contact.php, in the same order: method, origin, body size and
 * type, honeypot, form token, per-IP rate limit, field validation. The
 * enquiry is saved as a lead with source = "service:<slug>" and emailed to
 * MAIL_TO with Reply-To set to the sender. Either one is enough to report
 * success; if both fail the page offers email instead.
 */

use Site\ContactOptions;
use Site\Db;
use Site\FormToken;
use Site\Http;
use Site\Mailer;
use Site\RateLimit;
use Site\Settings;
use Site\ServiceOptions;
use Site\Validator;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('POST');
Http::requireAllowedOrigin($config);
$input = Http::readJson(16384);

// Honeypot: a field people never see. A bot that fills it gets a quiet "ok".
if (trim((string) ($input['website'] ?? '')) !== '') {
    error_log('[api] enquiry: honeypot filled, dropped');
    Http::json(200, ['ok' => true, 'delivered' => true]);
}

$token = (new FormToken($config))->verify((string) ($input['token'] ?? ''), 'enquiry');
if (!$token['valid']) {
    if ($token['reason'] === 'too_new') {
        Http::error(429, 'too_fast', 'One moment…', ['retry_after' => $token['wait']]);
    }
    Http::error(403, 'invalid_token', 'This form expired. Please send it again.');
}

$ip = Http::clientIp($config);
$ipHash = Http::ipHash($config, $ip);
$pdo = $config->hasDatabase() ? Db::tryConnect($config) : null;
$limit = (new RateLimit($config, $pdo))->hit('enquiry', $ipHash, [600 => 3, 86400 => 10]);
if (!$limit['allowed']) {
    $minutes = max(1, (int) ceil($limit['retry_after'] / 60));
    Http::error(429, 'rate_limited', "You've sent a few enquiries already. Please try again in {$minutes} minute" . ($minutes === 1 ? '' : 's') . ', or email me directly.', [
        'retry_after' => $limit['retry_after'],
    ]);
}

$validator = new Validator($input);
$service = $validator->oneOf('service', array_keys(ServiceOptions::SERVICES), 'service');
$name = $validator->text('name', 1, 100, 'Your name');
$email = $validator->email('email');
$company = $validator->text('company', 0, 120, 'Company');
$budget = $validator->oneOf('budget', array_keys(ServiceOptions::BUDGETS), 'budget');
$timeline = $validator->oneOf('timeline', ContactOptions::TIMELINES, 'timeline');
$message = $validator->text('message', 20, 5000, 'The message', true);
$page = $validator->text('page', 0, 200, 'Page');
$errors = $validator->errors();
if ($service === null && !isset($errors['service'])) {
    // oneOf() lets an empty value through; an enquiry always names its service.
    $errors['service'] = 'Pick a valid service.';
}
if ($errors) {
    Http::error(422, 'invalid', 'Please check the highlighted fields.', ['fields' => $errors]);
}

$serviceTitle = ServiceOptions::SERVICES[$service];
$budgetLabel = $budget !== null ? ServiceOptions::BUDGETS[$budget] : null;
$userAgent = mb_substr(Validator::clean($_SERVER['HTTP_USER_AGENT'] ?? '', false), 0, 255);
$now = gmdate('Y-m-d H:i:s');

// 1. Save the lead.
$leadId = null;
if ($pdo !== null) {
    try {
        $pdo->prepare(
            'INSERT INTO leads (created_at, source, intent, name, email, company, timeline, budget, message, page, ip_hash, user_agent)
             VALUES (:created_at, :source, :intent, :name, :email, :company, :timeline, :budget, :message, :page, :ip_hash, :user_agent)'
        )->execute([
            'created_at' => $now,
            'source' => 'service:' . $service,
            'intent' => 'service',
            'name' => $name,
            'email' => $email,
            'company' => $company !== '' ? $company : null,
            'timeline' => $timeline,
            'budget' => $budget,
            'message' => $message,
            'page' => $page !== '' ? $page : null,
            'ip_hash' => $ipHash,
            'user_agent' => $userAgent !== '' ? $userAgent : null,
        ]);
        $leadId = (int) $pdo->lastInsertId();
    } catch (Throwable $error) {
        error_log('[api] enquiry: could not save the lead: ' . $error->getMessage());
    }
}

// 2. Email it.
$lines = [
    $message,
    '',
    '—',
    "Service:  {$serviceTitle}",
    "Name:     {$name}",
    "Email:    {$email}",
];
if ($company !== '') {
    $lines[] = "Company:  {$company}";
}
if ($budgetLabel !== null) {
    $lines[] = "Budget:   {$budgetLabel}";
}
if ($timeline !== null) {
    $lines[] = "Timeline: {$timeline}";
}
$lines[] = '';
$lines[] = 'Sent from the ' . $serviceTitle . ' page on aayushmishra.engineer'
    . ($page !== '' ? " ({$page})" : '') . ' at ' . gmdate('j M Y, H:i') . ' UTC'
    . ($leadId ? " · lead #{$leadId}" : '') . '.';
$lines[] = 'Reply to this email to answer ' . $name . ' directly.';

$subject = "[Enquiry: {$serviceTitle}] {$name}" . ($company !== '' ? " · {$company}" : '');
$mailer = new Mailer($config);
$mailed = $mailer->configured() && $mailer->send(Settings::notificationEmail($config, $pdo), $subject, implode("\n", $lines), [
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
    Http::error(503, 'unavailable', "The enquiry couldn't be delivered from here. Please email it instead.", ['fallback' => 'mailto']);
}

Http::json(200, ['ok' => true, 'delivered' => $mailed]);
