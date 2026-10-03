<?php

declare(strict_types=1);

namespace Site;

use PDO;

/*
 * One PDO connection per request, prepared statements only (no emulation),
 * exceptions on error, utf8mb4 throughout.
 */
final class Db
{
    private static ?PDO $pdo = null;

    public static function connect(Config $config): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }
        if (!$config->hasDatabase()) {
            throw new \RuntimeException('The database is not configured.');
        }
        $charset = $config->string('db.charset') ?: 'utf8mb4';
        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config->string('db.host') ?: 'localhost',
            (int) ($config->get('db.port') ?: 3306),
            $config->string('db.name'),
            $charset
        );
        self::$pdo = new PDO($dsn, $config->string('db.user'), (string) $config->get('db.pass', ''), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 5,
        ]);
        self::$pdo->exec("SET time_zone = '+00:00'");
        return self::$pdo;
    }

    /** The connection, or null when it isn't configured or can't be reached. */
    public static function tryConnect(Config $config): ?PDO
    {
        try {
            return self::connect($config);
        } catch (\Throwable $error) {
            error_log('[api] database unavailable: ' . $error->getMessage());
            return null;
        }
    }

    public static function reset(): void
    {
        self::$pdo = null;
    }
}
