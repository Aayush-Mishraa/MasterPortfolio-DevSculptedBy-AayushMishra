<?php

declare(strict_types=1);

/*
 * GET /api/scan-report.php?id=<24 hex>: one scan's status and report (F24),
 * for /free-tools/site-scanner/report. The id is unguessable and is the only
 * key; the requester's email is never returned.
 */

use Site\Db;
use Site\Http;
use Site\Scanner;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('GET');

$pdo = $config->hasDatabase() ? Db::tryConnect($config) : null;
if ($pdo === null) {
    Http::error(503, 'unavailable', 'Reports are offline right now.');
}
$scan = Scanner::find($pdo, (string) ($_GET['id'] ?? ''));
if ($scan === null) {
    Http::error(404, 'not_found', 'No report with that id.');
}

$report = $scan['results'] ? json_decode((string) $scan['results'], true) : null;
Http::json(200, [
    'ok' => true,
    'scan' => [
        'id' => $scan['public_id'],
        'url' => $scan['url'],
        'host' => $scan['host'],
        'status' => $scan['status'],
        'created_at' => gmdate('c', (int) strtotime($scan['created_at'] . ' UTC')),
        'updated_at' => gmdate('c', (int) strtotime($scan['updated_at'] . ' UTC')),
        'passed' => $scan['passed'] !== null ? (int) $scan['passed'] : null,
        'failed' => $scan['failed'] !== null ? (int) $scan['failed'] : null,
        'signed_off' => $scan['signed_off'] !== null ? (bool) $scan['signed_off'] : null,
        'error' => $scan['status'] === 'failed' ? ($scan['error'] ?: 'The scan job failed.') : null,
        'report' => is_array($report) ? $report : null,
        'spec' => $scan['spec'],
        'badge' => (new Scanner($config))->badgeUrl($scan['public_id']),
    ],
]);
