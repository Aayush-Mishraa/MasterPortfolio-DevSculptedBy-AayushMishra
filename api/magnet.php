<?php

declare(strict_types=1);

/*
 * POST /api/magnet.php: the email capture on the free tools (Stage 3).
 *
 *   checklist     F20  the Release Readiness Checklist PDF (signed download link)
 *   ai-readiness  F23  the full AI-Agent Readiness report (a link back to it)
 *   starter-kit   F27  the Starter Kit waitlist
 *
 * Same guards as the other forms (origin, honeypot, form token, per-IP and
 * per-address limits). Each request is saved as a lead with source
 * "magnet:<key>" so it shows up in /admin, and the visitor gets an email with
 * what they asked for. Ticking "newsletter" also runs the normal subscribe
 * flow (Buttondown double opt-in) with source = checklist / quiz / starter-kit.
 * The checklist link is also returned at once, so the PDF never depends on mail.
 */

use Site\Buttondown;
use Site\Db;
use Site\FormToken;
use Site\Http;
use Site\Magnets;
use Site\Mailer;
use Site\RateLimit;
use Site\Validator;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('POST');
Http::requireAllowedOrigin($config);
$input = Http::readJson(4096);

if (trim((string) ($input['website'] ?? '')) !== '') {
    error_log('[api] magnet: honeypot filled, dropped');
    Http::json(200, ['ok' => true, 'mailed' => false]);
}

$token = (new FormToken($config))->verify((string) ($input['token'] ?? ''), 'magnet');
if (!$token['valid']) {
    if ($token['reason'] === 'too_new') {
        Http::error(429, 'too_fast', 'One moment…', ['retry_after' => $token['wait']]);
    }
    Http::error(403, 'invalid_token', 'This form expired. Please try again.');
}

$validator = new Validator($input);
$magnet = $validator->oneOf('magnet', array_keys(Magnets::MAGNETS), 'resource');
$email = $validator->email('email');
$name = $validator->text('name', 0, 100, 'Your name');
$detail = $validator->text('detail', 0, 120, 'Details');
$page = $validator->text('page', 0, 200, 'Page');
$newsletter = ($input['newsletter'] ?? false) === true;
$errors = $validator->errors();
if ($magnet === null && !isset($errors['magnet'])) {
    $errors['magnet'] = 'Pick a valid resource.';
}
// The quiz sends its answers (one digit per question) so the emailed link can rebuild the report.
if ($magnet === 'ai-readiness' && !preg_match('/^[0-3]{12}$/', $detail)) {
    $errors['detail'] = 'The quiz answers are missing.';
}
if ($errors) {
    Http::error(422, 'invalid', 'Please check your email address.', ['fields' => $errors]);
}

$ip = Http::clientIp($config);
$ipHash = Http::ipHash($config, $ip);
$pdo = $config->hasDatabase() ? Db::tryConnect($config) : null;
$limits = new RateLimit($config, $pdo);
$byIp = $limits->hit('magnet', $ipHash, [3600 => 8, 86400 => 25]);
$byEmail = $limits->hit('magnet-email', $email, [86400 => 4]);
if (!$byIp['allowed'] || !$byEmail['allowed']) {
    Http::error(429, 'rate_limited', 'That\'s a lot of requests from here. Please try again later.', [
        'retry_after' => max($byIp['retry_after'], $byEmail['retry_after']),
    ]);
}

$title = Magnets::title($magnet);
$site = rtrim($config->string('site_url'), '/');
$now = gmdate('Y-m-d H:i:s');
$userAgent = mb_substr(Validator::clean($_SERVER['HTTP_USER_AGENT'] ?? '', false), 0, 255);
$summary = match ($magnet) {
    'checklist' => 'Downloaded the Release Readiness Checklist.',
    'ai-readiness' => 'Asked for the full AI-Agent Readiness report.' . (isset($input['score']) && is_int($input['score']) ? ' Score: ' . max(0, min(100, $input['score'])) . '/100.' : ''),
    'starter-kit' => 'Joined the Playwright + AI Starter Kit waitlist.',
};

// 1. The lead and the request.
$leadId = null;
$requestId = 0;
if ($pdo !== null) {
    try {
        $pdo->prepare(
            'INSERT INTO leads (created_at, source, intent, name, email, message, page, ip_hash, user_agent)
             VALUES (:created_at, :source, :intent, :name, :email, :message, :page, :ip_hash, :user_agent)'
        )->execute([
            'created_at' => $now,
            'source' => 'magnet:' . $magnet,
            'intent' => 'magnet',
            'name' => $name !== '' ? $name : '(not given)',
            'email' => $email,
            'message' => $summary,
            'page' => $page !== '' ? $page : null,
            'ip_hash' => $ipHash,
            'user_agent' => $userAgent !== '' ? $userAgent : null,
        ]);
        $leadId = (int) $pdo->lastInsertId();
        $pdo->prepare(
            'INSERT INTO magnet_requests (created_at, magnet, email, lead_id, newsletter, detail, ip_hash)
             VALUES (:created_at, :magnet, :email, :lead_id, :newsletter, :detail, :ip_hash)'
        )->execute([
            'created_at' => $now,
            'magnet' => $magnet,
            'email' => $email,
            'lead_id' => $leadId,
            'newsletter' => $newsletter ? 1 : 0,
            'detail' => $detail !== '' ? $detail : null,
            'ip_hash' => $ipHash,
        ]);
        $requestId = (int) $pdo->lastInsertId();
    } catch (Throwable $error) {
        error_log('[api] magnet: could not save the request: ' . $error->getMessage());
    }
}

// 2. The newsletter, only when asked (Buttondown sends its own confirmation).
$subscribed = false;
if ($newsletter) {
    $buttondown = new Buttondown($config);
    if ($buttondown->configured()) {
        $result = $buttondown->subscribe($email, Magnets::source($magnet), $ip, $site . ($page !== '' && $page[0] === '/' ? $page : '/'));
        $subscribed = in_array($result['outcome'], ['created', 'exists'], true);
        if ($result['outcome'] === 'created' && $pdo !== null) {
            try {
                $pdo->prepare(
                    'INSERT INTO subscribers (email, status, source, buttondown_id, created_at, updated_at, ip_hash)
                     VALUES (:email, :status, :source, :buttondown_id, :created_at, :updated_at, :ip_hash)
                     ON DUPLICATE KEY UPDATE buttondown_id = COALESCE(VALUES(buttondown_id), buttondown_id), updated_at = VALUES(updated_at)'
                )->execute([
                    'email' => $email,
                    'status' => 'pending',
                    'source' => Magnets::source($magnet),
                    'buttondown_id' => $result['id'],
                    'created_at' => $now,
                    'updated_at' => $now,
                    'ip_hash' => $ipHash,
                ]);
            } catch (Throwable $error) {
                error_log('[api] magnet: could not save the subscriber: ' . $error->getMessage());
            }
        }
    }
}

// 3. What they asked for.
$download = Magnets::file($magnet) !== null ? Magnets::downloadUrl($config, $magnet, $requestId) : null;
$hello = $name !== '' ? 'Hi ' . explode(' ', $name)[0] . ',' : 'Hi,';
$lines = match ($magnet) {
    'checklist' => [
        $hello,
        '',
        'Here is the Release Readiness Checklist: 50 checks to run before you ship.',
        '',
        $download,
        '',
        'The link works for 7 days. Print it, or copy the checks into your release ticket.',
        '',
        'If a release is coming up and you\'d like a second pair of eyes, a Release Review is a 60-minute call:',
        $site . '/services/release-review',
    ],
    'ai-readiness' => [
        $hello,
        '',
        'Here is your full AI-Agent Readiness report, with every answer, what it means and what to do next:',
        '',
        $site . '/free-tools/ai-readiness-quiz?r=' . $detail,
        '',
        'If you want your LLM feature evaluated properly (faithfulness, safety, prompt injection, regressions), see the AI Feature Eval Pack:',
        $site . '/services/ai-feature-eval-pack',
    ],
    'starter-kit' => [
        $hello,
        '',
        'You\'re on the waitlist for the Playwright + AI Starter Kit. I\'ll email you once when it\'s ready, with the launch price.',
        '',
        'What it will include: ' . $site . '/starter-kit',
    ],
};
$lines[] = '';
$lines[] = '— Aayush Mishra, Senior SDET & QA Lead';
$lines[] = $site;
$lines[] = '';
$lines[] = 'You got this email because this address was entered on ' . $site . ($page !== '' ? $page : '') . '. It is not a newsletter sign-up'
    . ($newsletter ? ' (the newsletter sends its own confirmation email).' : '.');

$mailer = new Mailer($config);
$mailed = $mailer->configured() && $mailer->send($email, $title . ' · aayushmishra.engineer', implode("\n", $lines), [
    'headers' => ['X-Site-Magnet' => $magnet],
]);

if (!$leadId && !$mailed && $download === null) {
    Http::error(503, 'unavailable', 'This couldn\'t be sent from here right now. Please try again later.');
}

Http::json(200, [
    'ok' => true,
    'mailed' => $mailed,
    'subscribed' => $subscribed,
    'download' => $download,
]);
