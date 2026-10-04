<?php

declare(strict_types=1);

/*
 * GET /api/badge.php?id=<scan id>: the embeddable scan badge (F24), an SVG
 * in the shields.io shape: "QA scan | 14 passed · 3 failed" (red) or
 * "QA scan | signed off ✓" (green). Unknown or unfinished scans get a grey one.
 */

use Site\Db;
use Site\Scanner;

$config = require __DIR__ . '/lib/bootstrap.php';

$label = 'QA scan';
$value = 'pending';
$color = '#6b7280';
$pdo = $config->hasDatabase() ? Db::tryConnect($config) : null;
$scan = $pdo !== null ? Scanner::find($pdo, (string) ($_GET['id'] ?? '')) : null;
if ($scan === null) {
    $value = 'unknown';
} elseif ($scan['status'] === 'done') {
    $failed = (int) $scan['failed'];
    $value = $failed === 0 ? 'signed off ✓' : ((int) $scan['passed']) . ' passed · ' . $failed . ' failed';
    $color = $failed === 0 ? '#15803d' : '#b91c1c';
} elseif ($scan['status'] === 'failed') {
    $value = 'error';
}

// Rough text widths (Verdana 11px ≈ 6.5px a character), as shields.io does.
$width = static fn (string $text): int => (int) ceil(mb_strlen($text) * 6.6) + 12;
$left = $width($label);
$right = $width($value);
$total = $left + $right;
$e = static fn (string $text): string => htmlspecialchars($text, ENT_QUOTES | ENT_XML1, 'UTF-8');

header_remove('Content-Security-Policy');
header('Content-Type: image/svg+xml; charset=utf-8');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'");
header('Cache-Control: public, max-age=600');
echo '<svg xmlns="http://www.w3.org/2000/svg" width="' . $total . '" height="20" role="img" aria-label="' . $e("{$label}: {$value}") . '">'
    . '<title>' . $e("{$label}: {$value}") . '</title>'
    . '<linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>'
    . '<clipPath id="r"><rect width="' . $total . '" height="20" rx="3" fill="#fff"/></clipPath>'
    . '<g clip-path="url(#r)"><rect width="' . $left . '" height="20" fill="#24292f"/><rect x="' . $left . '" width="' . $right . '" height="20" fill="' . $color . '"/>'
    . '<rect width="' . $total . '" height="20" fill="url(#s)"/></g>'
    . '<g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">'
    . '<text x="' . ($left / 2) . '" y="14">' . $e($label) . '</text>'
    . '<text x="' . ($left + $right / 2) . '" y="14">' . $e($value) . '</text></g></svg>';
