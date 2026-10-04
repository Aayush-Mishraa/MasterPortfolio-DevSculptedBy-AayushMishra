<?php

declare(strict_types=1);

/*
 * GET /api/download.php?f=checklist&r=<request>&e=<expiry>&s=<signature>
 *
 * Serves a lead magnet's file from api/assets/ (closed to the web) when the
 * link magnet.php signed is valid and not expired. Counts the download.
 */

use Site\Db;
use Site\Http;
use Site\Magnets;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('GET', 'HEAD');

$magnet = (string) ($_GET['f'] ?? '');
$requestId = (int) ($_GET['r'] ?? 0);
$expires = (int) ($_GET['e'] ?? 0);
$signature = (string) ($_GET['s'] ?? '');

if (!Magnets::validLink($config, $magnet, $requestId, $expires, $signature)) {
    header('Content-Type: text/html; charset=utf-8');
    http_response_code(410);
    $site = rtrim($config->string('site_url'), '/');
    echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Link expired</title>'
        . '<body style="font-family:system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1rem;line-height:1.5">'
        . '<h1>This link has expired</h1><p>Download links work for 7 days. Get a fresh one on '
        . '<a href="' . htmlspecialchars($site) . '/free-tools/release-readiness-checklist">the checklist page</a>.</p></body>';
    exit;
}

$file = __DIR__ . '/assets/' . Magnets::file($magnet);
if (!is_file($file)) {
    error_log('[api] download: missing file ' . $file);
    Http::error(404, 'not_found', 'That file isn\'t available right now.');
}

if ($requestId > 0 && $config->hasDatabase() && Http::method() === 'GET') {
    $pdo = Db::tryConnect($config);
    if ($pdo !== null) {
        try {
            $pdo->prepare('UPDATE magnet_requests SET downloads = downloads + 1 WHERE id = :id')->execute(['id' => $requestId]);
        } catch (Throwable $error) {
            // the count is informational
        }
    }
}

header('Content-Type: application/pdf');
header('Content-Length: ' . filesize($file));
header('Content-Disposition: attachment; filename="' . basename($file) . '"');
header("Content-Security-Policy: default-src 'none'");
if (Http::method() === 'GET') {
    readfile($file);
}
exit;
