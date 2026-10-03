<?php

declare(strict_types=1);

/*
 * POST /api/subscribe.php: newsletter sign-up.
 *
 * Same guards as the contact form (origin, honeypot, form token, per-IP limit),
 * then the address goes to Buttondown, which emails the confirmation link
 * (double opt-in). A local copy is kept as "pending" until Buttondown's
 * webhook reports it confirmed. The reply never says whether an address was
 * already on the list.
 */

use Site\Buttondown;
use Site\Db;
use Site\FormToken;
use Site\Http;
use Site\RateLimit;
use Site\Validator;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('POST');
Http::requireAllowedOrigin($config);
$input = Http::readJson(4096);

$pending = ['ok' => true, 'status' => 'pending', 'message' => 'Almost there: check your inbox for a confirmation link.'];

if (trim((string) ($input['website'] ?? '')) !== '') {
    Http::json(200, $pending);
}

$token = (new FormToken($config))->verify((string) ($input['token'] ?? ''), 'subscribe');
if (!$token['valid']) {
    if ($token['reason'] === 'too_new') {
        Http::error(429, 'too_fast', 'One moment…', ['retry_after' => $token['wait']]);
    }
    Http::error(403, 'invalid_token', 'This form expired. Please try again.');
}

$ip = Http::clientIp($config);
$ipHash = Http::ipHash($config, $ip);
$pdo = $config->hasDatabase() ? Db::tryConnect($config) : null;
$limit = (new RateLimit($config, $pdo))->hit('subscribe', $ipHash, [3600 => 5, 86400 => 20]);
if (!$limit['allowed']) {
    Http::error(429, 'rate_limited', 'Too many sign-ups from here. Please try again later.', ['retry_after' => $limit['retry_after']]);
}

$validator = new Validator($input);
$email = $validator->email('email');
$source = $validator->oneOf('source', ['footer', 'blog', 'checklist'], 'source', 'footer');
$page = $validator->text('page', 0, 200, 'Page');
if ($validator->fails()) {
    Http::error(422, 'invalid', 'Please check your email address.', ['fields' => $validator->errors()]);
}

$buttondown = new Buttondown($config);
if (!$buttondown->configured()) {
    Http::error(503, 'not_configured', 'The newsletter isn\'t open yet.');
}

$referrer = rtrim($config->string('site_url'), '/') . ($page !== '' && $page[0] === '/' ? $page : '/');
$result = $buttondown->subscribe($email, (string) $source, $ip, $referrer);

if ($result['outcome'] === 'rejected') {
    Http::error(422, 'invalid', 'That address couldn\'t be subscribed. Please check it.', ['fields' => ['email' => 'That address couldn\'t be subscribed.']]);
}
if ($result['outcome'] === 'unavailable') {
    Http::error(502, 'upstream', 'The newsletter service didn\'t answer. Please try again in a minute.');
}

if ($result['outcome'] === 'created' && $pdo !== null) {
    try {
        $now = gmdate('Y-m-d H:i:s');
        $pdo->prepare(
            'INSERT INTO subscribers (email, status, source, buttondown_id, created_at, updated_at, ip_hash)
             VALUES (:email, :status, :source, :buttondown_id, :created_at, :updated_at, :ip_hash)
             ON DUPLICATE KEY UPDATE
               buttondown_id = COALESCE(VALUES(buttondown_id), buttondown_id),
               status = IF(status = \'confirmed\', status, VALUES(status)),
               updated_at = VALUES(updated_at)'
        )->execute([
            'email' => $email,
            'status' => 'pending',
            'source' => $source,
            'buttondown_id' => $result['id'],
            'created_at' => $now,
            'updated_at' => $now,
            'ip_hash' => $ipHash,
        ]);
    } catch (Throwable $error) {
        error_log('[api] subscribe: could not save the local copy: ' . $error->getMessage());
    }
}

Http::json(200, $pending);
