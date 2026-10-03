<?php

declare(strict_types=1);

/*
 * Loaded first by every endpoint: autoloading, error handling and the
 * headers every API response carries (no caching, no indexing).
 */

use Site\Config;
use Site\Http;

// Before anything can fail: errors go to the log, never into a response.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);
if (function_exists('header_remove')) {
    header_remove('X-Powered-By');
}

$autoload = __DIR__ . '/../vendor/autoload.php';
if (is_file($autoload)) {
    require $autoload;
} else {
    // No Composer install (e.g. a bare checkout): our own classes still load.
    spl_autoload_register(static function (string $class): void {
        if (strncmp($class, 'Site\\', 5) === 0) {
            $file = __DIR__ . '/' . str_replace('\\', '/', substr($class, 5)) . '.php';
            if (is_file($file)) {
                require $file;
            }
        }
    });
}

Http::sendCommonHeaders();

// Warnings become exceptions (caught below as a 500); deprecations, which a
// newer PHP on the server can add to a dependency overnight, are only logged.
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    if ($severity & (E_DEPRECATED | E_USER_DEPRECATED | E_NOTICE | E_USER_NOTICE)) {
        error_log("[api] notice: {$message} at {$file}:{$line}");
        return true;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

set_exception_handler(static function (Throwable $error): void {
    error_log('[api] ' . get_class($error) . ': ' . $error->getMessage() . ' at ' . $error->getFile() . ':' . $error->getLine());
    Http::error(500, 'server_error', 'Something went wrong on our side. Please try again, or email instead.');
});

return Config::load();
