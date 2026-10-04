<?php

declare(strict_types=1);

/*
 * POST /api/scan.php: "Test my site" (F24).
 *
 * Checks, in order: method, origin, honeypot, form token, consent, the URL
 * (SsrfGuard: public http(s) site only, every resolved address public), the
 * limits (2 per IP and 3 per address a day, scanner.daily_cap in total), then
 * saves the scan + a lead and starts the GitHub Actions job. The report is
 * emailed when the job calls back (scan-callback.php).
 *
 * When the scanner isn't configured yet, the request is still saved
 * ("waiting") and can be started later from /admin/scans.
 */

use Site\Db;
use Site\FormToken;
use Site\Http;
use Site\Mailer;
use Site\RateLimit;
use Site\Scanner;
use Site\Settings;
use Site\SsrfGuard;
use Site\Validator;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('POST');
Http::requireAllowedOrigin($config);
$input = Http::readJson(4096);

if (trim((string) ($input['website'] ?? '')) !== '') {
    error_log('[api] scan: honeypot filled, dropped');
    Http::json(200, ['ok' => true, 'status' => 'queued', 'id' => null]);
}

$token = (new FormToken($config))->verify((string) ($input['token'] ?? ''), 'scan');
if (!$token['valid']) {
    if ($token['reason'] === 'too_new') {
        Http::error(429, 'too_fast', 'One moment…', ['retry_after' => $token['wait']]);
    }
    Http::error(403, 'invalid_token', 'This form expired. Please try again.');
}

$validator = new Validator($input);
$email = $validator->email('email');
$rawUrl = $validator->text('url', 1, 500, 'The address');
$page = $validator->text('page', 0, 200, 'Page');
$errors = $validator->errors();
if (($input['consent'] ?? false) !== true) {
    $errors['consent'] = 'Please confirm you may test this site.';
}
$target = null;
if (!isset($errors['url'])) {
    $target = SsrfGuard::check($rawUrl);
    if (!$target['ok']) {
        $errors['url'] = $target['reason'];
    }
}
if ($errors) {
    Http::error(422, 'invalid', 'Please check the highlighted fields.', ['fields' => $errors]);
}

$ip = Http::clientIp($config);
$ipHash = Http::ipHash($config, $ip);
$pdo = $config->hasDatabase() ? Db::tryConnect($config) : null;
if ($pdo === null) {
    Http::error(503, 'unavailable', 'The scanner is offline right now. Please try again later.');
}

$limits = new RateLimit($config, $pdo);
$byIp = $limits->hit('scan', $ipHash, [86400 => 2]);
$byEmail = $limits->hit('scan-email', $email, [86400 => 3]);
if (!$byIp['allowed'] || !$byEmail['allowed']) {
    Http::error(429, 'rate_limited', 'The beta allows two scans a day from here. Please try again tomorrow.', [
        'retry_after' => max($byIp['retry_after'], $byEmail['retry_after']),
    ]);
}
$cap = max(1, (int) $config->get('scanner.daily_cap', 30));
$today = (int) $pdo->query("SELECT COUNT(*) FROM scans WHERE created_at >= UTC_DATE()")->fetchColumn();
if ($today >= $cap) {
    Http::error(429, 'busy', 'Today\'s scans are used up (it\'s a beta). Please try again tomorrow.', ['retry_after' => 86400 - (time() % 86400)]);
}

$scanner = new Scanner($config);
$publicId = Scanner::newId();
$now = gmdate('Y-m-d H:i:s');
$userAgent = mb_substr(Validator::clean($_SERVER['HTTP_USER_AGENT'] ?? '', false), 0, 255);

$pdo->prepare(
    'INSERT INTO leads (created_at, source, intent, name, email, message, page, ip_hash, user_agent)
     VALUES (:created_at, :source, :intent, :name, :email, :message, :page, :ip_hash, :user_agent)'
)->execute([
    'created_at' => $now,
    'source' => 'scanner',
    'intent' => 'scan',
    'name' => '(scanner)',
    'email' => $email,
    'message' => 'Requested a scan of ' . $target['url'],
    'page' => $page !== '' ? $page : null,
    'ip_hash' => $ipHash,
    'user_agent' => $userAgent !== '' ? $userAgent : null,
]);
$leadId = (int) $pdo->lastInsertId();

$pdo->prepare(
    'INSERT INTO scans (public_id, created_at, updated_at, url, host, email, status, lead_id, ip_hash)
     VALUES (:public_id, :created_at, :updated_at, :url, :host, :email, :status, :lead_id, :ip_hash)'
)->execute([
    'public_id' => $publicId,
    'created_at' => $now,
    'updated_at' => $now,
    'url' => $target['url'],
    'host' => $target['host'],
    'email' => $email,
    'status' => 'waiting',
    'lead_id' => $leadId,
    'ip_hash' => $ipHash,
]);

$started = $scanner->dispatch($publicId, $target['url']);
if ($started) {
    $pdo->prepare("UPDATE scans SET status = 'queued', updated_at = :now WHERE public_id = :id")->execute(['now' => $now, 'id' => $publicId]);
}

// A heads-up for me: scans are leads too.
$mailer = new Mailer($config);
if ($mailer->configured()) {
    $mailer->send(Settings::notificationEmail($config, $pdo), '[Scan] ' . $target['host'] . ' · ' . $email, implode("\n", [
        "A scan was requested for {$target['url']}",
        "Email: {$email}",
        'Status: ' . ($started ? 'queued on GitHub Actions' : 'waiting (the scanner isn\'t configured, or GitHub refused the job)'),
        'Report: ' . $scanner->reportUrl($publicId),
        "Lead #{$leadId}",
    ]), ['reply_to' => $email]);
}

Http::json(200, [
    'ok' => true,
    'id' => $publicId,
    'status' => $started ? 'queued' : 'waiting',
    'report' => $scanner->reportUrl($publicId),
]);
