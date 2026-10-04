<?php

declare(strict_types=1);

namespace Site;

use PDO;
use Throwable;

/*
 * Settings changed from /admin (the settings table), with the config file as
 * the fallback. Reads never fail: before migration 003 or without a database
 * the config value is used.
 */
final class Settings
{
    public static function get(?PDO $pdo, string $name): ?string
    {
        if ($pdo === null) {
            return null;
        }
        try {
            $statement = $pdo->prepare('SELECT value FROM settings WHERE name = :name');
            $statement->execute(['name' => $name]);
            $value = $statement->fetchColumn();
            return $value === false || $value === null || $value === '' ? null : (string) $value;
        } catch (Throwable $error) {
            return null;
        }
    }

    public static function set(PDO $pdo, string $name, ?string $value): void
    {
        $pdo->prepare(
            'INSERT INTO settings (name, value, updated_at) VALUES (:name, :value, UTC_TIMESTAMP())
             ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = VALUES(updated_at)'
        )->execute(['name' => $name, 'value' => $value]);
    }

    /** Where leads and enquiries are emailed: the admin setting, else MAIL_TO. */
    public static function notificationEmail(Config $config, ?PDO $pdo): string
    {
        $saved = self::get($pdo, 'notification_email');
        return $saved !== null && filter_var($saved, FILTER_VALIDATE_EMAIL) ? $saved : $config->string('mail_to');
    }
}
