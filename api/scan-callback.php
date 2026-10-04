<?php

declare(strict_types=1);

/*
 * POST /api/scan-callback.php: the scan job reports back (F24).
 *
 * Server to server, so no Origin or form token: the request must carry
 * X-Scan-Timestamp (within 5 minutes) and X-Scan-Signature =
 * hex HMAC-SHA256(scanner.callback_secret, "<timestamp>.<raw body>").
 *
 * Body: { scan_id, status: "running" | "done" | "failed", run_url?, error?,
 *         report?: { checks: [...], metrics: {...}, ... }, spec?: "<.spec.ts>" }
 *
 * "done" stores the report and emails it once, with the .spec.ts attached.
 */

use Site\Db;
use Site\Http;
use Site\Mailer;
use Site\Scanner;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('POST');

$max = 2 * 1024 * 1024;
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > $max) {
    Http::error(413, 'payload_too_large', 'Report too large.');
}
$raw = (string) file_get_contents('php://input', false, null, 0, $max + 1);
if (strlen($raw) > $max) {
    Http::error(413, 'payload_too_large', 'Report too large.');
}

$scanner = new Scanner($config);
if (!$scanner->validSignature($raw, Http::header('X-Scan-Timestamp'), Http::header('X-Scan-Signature'))) {
    Http::error(401, 'bad_signature', 'Signature check failed.');
}

$data = json_decode($raw, true);
if (!is_array($data) || !is_string($data['scan_id'] ?? null)) {
    Http::error(400, 'invalid_json', 'The report could not be read.');
}
$pdo = $config->hasDatabase() ? Db::tryConnect($config) : null;
if ($pdo === null) {
    Http::error(503, 'unavailable', 'Database unavailable.');
}
$scan = Scanner::find($pdo, $data['scan_id']);
if ($scan === null) {
    Http::error(404, 'not_found', 'Unknown scan.');
}

$status = in_array($data['status'] ?? '', ['running', 'done', 'failed'], true) ? $data['status'] : 'failed';
$runUrl = is_string($data['run_url'] ?? null) && str_starts_with($data['run_url'], 'https://github.com/') ? mb_substr($data['run_url'], 0, 300) : $scan['run_url'];
$now = gmdate('Y-m-d H:i:s');

if ($status === 'running') {
    $pdo->prepare("UPDATE scans SET status = 'running', run_url = :run_url, updated_at = :now WHERE id = :id AND status IN ('waiting', 'queued')")
        ->execute(['run_url' => $runUrl, 'now' => $now, 'id' => $scan['id']]);
    Http::json(200, ['ok' => true]);
}

if ($status === 'failed') {
    $error = mb_substr(trim((string) ($data['error'] ?? 'The scan job failed.')), 0, 500);
    $pdo->prepare("UPDATE scans SET status = 'failed', error = :error, run_url = :run_url, updated_at = :now WHERE id = :id")
        ->execute(['error' => $error, 'run_url' => $runUrl, 'now' => $now, 'id' => $scan['id']]);
    Http::json(200, ['ok' => true]);
}

// done
$report = is_array($data['report'] ?? null) ? $data['report'] : [];
$checks = is_array($report['checks'] ?? null) ? $report['checks'] : [];
$passed = count(array_filter($checks, static fn ($check) => ($check['status'] ?? '') === 'pass'));
$failed = count(array_filter($checks, static fn ($check) => ($check['status'] ?? '') === 'fail'));
$spec = is_string($data['spec'] ?? null) ? mb_substr($data['spec'], 0, 200000) : null;

$pdo->prepare(
    "UPDATE scans SET status = 'done', passed = :passed, failed = :failed, signed_off = :signed_off,
       results = :results, spec = :spec, run_url = :run_url, error = NULL, updated_at = :now WHERE id = :id"
)->execute([
    'passed' => $passed,
    'failed' => $failed,
    'signed_off' => $failed === 0 ? 1 : 0,
    'results' => json_encode($report, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
    'spec' => $spec,
    'run_url' => $runUrl,
    'now' => $now,
    'id' => $scan['id'],
]);

if ((int) $scan['mail_sent'] === 1) {
    Http::json(200, ['ok' => true, 'mailed' => false]);
}

$verdict = Scanner::verdict($passed, $failed);
$lines = [
    'Your scan of ' . $scan['url'] . ' is ready.',
    '',
    $verdict,
    '',
];
foreach ($checks as $check) {
    $mark = match ($check['status'] ?? '') {
        'pass' => '✓',
        'fail' => '✗',
        'warn' => '!',
        default => '-',
    };
    $lines[] = $mark . ' ' . mb_substr((string) ($check['title'] ?? $check['id'] ?? 'check'), 0, 120)
        . (!empty($check['summary']) ? ' — ' . mb_substr((string) $check['summary'], 0, 200) : '');
}
$lines[] = '';
$lines[] = 'Full report: ' . $scanner->reportUrl($scan['public_id']);
if ($spec !== null && $failed > 0) {
    $lines[] = '';
    $lines[] = 'Attached: failing-checks.spec.ts, a Playwright test per failed check. Drop it into any Playwright project and run';
    $lines[] = '  npx playwright test failing-checks.spec.ts';
    $lines[] = 'It fails today and passes once each issue is fixed.';
}
$lines[] = '';
$lines[] = 'Badge for your README or footer (it updates if you scan again):';
$lines[] = '  <a href="' . $scanner->reportUrl($scan['public_id']) . '"><img src="' . $scanner->badgeUrl($scan['public_id']) . '" alt="QA scan: ' . $passed . ' passed, ' . $failed . ' failed"></a>';
$lines[] = '';
$lines[] = 'Want these fixed, or a deeper look before a release? The QA Health Check covers what an automated scan can\'t:';
$lines[] = rtrim($config->string('site_url'), '/') . '/services/qa-health-check';
$lines[] = '';
$lines[] = '— Aayush Mishra, Senior SDET & QA Lead';
$lines[] = '';
$lines[] = 'You got this because this address asked for a scan on ' . rtrim($config->string('site_url'), '/') . '/free-tools/site-scanner. No newsletter, no follow-ups unless you reply.';

$mailer = new Mailer($config);
$attachments = $spec !== null && $failed > 0 ? [['name' => 'failing-checks.spec.ts', 'content' => $spec, 'type' => 'text/plain']] : [];
$mailed = $mailer->configured() && $mailer->send($scan['email'], 'Scan report: ' . $scan['host'] . ' · ' . $verdict, implode("\n", $lines), [
    'attachments' => $attachments,
    'headers' => ['X-Site-Scan' => $scan['public_id']],
]);
if ($mailed) {
    $pdo->prepare('UPDATE scans SET mail_sent = 1 WHERE id = :id')->execute(['id' => $scan['id']]);
}

Http::json(200, ['ok' => true, 'mailed' => $mailed]);
