<?php

declare(strict_types=1);

/*
 * GET /api/health.php: is the API up, and what is configured?
 * Public answer: yes/no per check, nothing secret. With the admin token
 * (Authorization: Bearer ...) it adds the details needed to debug a deploy.
 */

use Site\Db;
use Site\Http;
use Site\Mailer;
use Site\Migrator;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('GET', 'HEAD');

$pdo = $config->hasDatabase() ? Db::tryConnect($config) : null;
$pending = null;
if ($pdo !== null) {
    try {
        $pending = (new Migrator($pdo, __DIR__ . '/migrations'))->pending();
    } catch (Throwable $error) {
        $pending = null;
    }
}

$checks = [
    'config' => $config->source() !== 'missing',
    'secret' => $config->hasSecret(),
    'database' => $config->hasDatabase() ? $pdo !== null : null,
    'schema' => $pending === null ? null : $pending === [],
    'mail' => (new Mailer($config))->configured(),
];
$body = [
    'ok' => $checks['config'] && $checks['database'] !== false && $checks['schema'] !== false,
    'service' => 'aayushmishra.engineer api',
    'time' => gmdate('c'),
    'php' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION,
    'checks' => $checks,
];

if (Http::isAdmin($config)) {
    $headers = [];
    foreach (['REMOTE_ADDR', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CF_CONNECTING_IP', 'HTTP_TRUE_CLIENT_IP', 'HTTP_X_CLIENT_IP', 'HTTP_FORWARDED'] as $key) {
        if (!empty($_SERVER[$key])) {
            $headers[$key] = (string) $_SERVER[$key];
        }
    }
    $body['admin'] = [
        'config_source' => $config->source(),
        'php_version' => PHP_VERSION,
        'server' => (string) ($_SERVER['SERVER_SOFTWARE'] ?? ''),
        'pending_migrations' => $pending,
        'client_ip' => Http::clientIp($config),
        'ip_headers' => $headers,
        'extensions' => array_values(array_filter(['pdo_mysql', 'mbstring', 'openssl', 'curl', 'json'], 'extension_loaded')),
    ];
}

Http::json(200, $body);
