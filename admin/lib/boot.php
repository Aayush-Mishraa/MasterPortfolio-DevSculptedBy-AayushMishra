<?php

declare(strict_types=1);

/*
 * Loaded first by /admin: the API's classes and config (../api), the admin's
 * own classes, errors to the log only, and the headers every admin page
 * sends (never cached, never indexed, no framing, no scripts).
 */

use Site\Config;

ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
if (function_exists('header_remove')) {
    header_remove('X-Powered-By');
}

$api = dirname(__DIR__, 2) . '/api';
if (is_file($api . '/vendor/autoload.php')) {
    require $api . '/vendor/autoload.php';
}
spl_autoload_register(static function (string $class) use ($api): void {
    if (strncmp($class, 'Site\\Admin\\', 11) === 0) {
        $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, 11)) . '.php';
    } elseif (strncmp($class, 'Site\\', 5) === 0) {
        $file = $api . '/lib/' . str_replace('\\', '/', substr($class, 5)) . '.php';
    } else {
        return;
    }
    if (is_file($file)) {
        require $file;
    }
});

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store, private, max-age=0');
header('Pragma: no-cache');
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');
header("Content-Security-Policy: default-src 'none'; style-src 'self'; img-src 'self' data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");

set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    if ($severity & (E_DEPRECATED | E_USER_DEPRECATED | E_NOTICE | E_USER_NOTICE)) {
        error_log("[admin] notice: {$message} at {$file}:{$line}");
        return true;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(static function (Throwable $error): void {
    error_log('[admin] ' . get_class($error) . ': ' . $error->getMessage() . ' at ' . $error->getFile() . ':' . $error->getLine());
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo '<!doctype html><meta charset="utf-8"><title>Admin error</title><p>Something went wrong. The error is in the server log.</p>';
});

return Config::load();
