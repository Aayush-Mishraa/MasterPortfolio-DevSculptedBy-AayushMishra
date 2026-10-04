<?php

declare(strict_types=1);

namespace Site\Admin;

use Site\Config;

/*
 * The admin session: a cookie that is Secure, HttpOnly and SameSite=Strict
 * ("__Host-admin" on HTTPS), strict session ids, a new id at login, 30 minutes
 * idle and 8 hours at most. Also the CSRF token every form carries.
 */
final class Session
{
    public const IDLE = 1800;
    public const MAX_AGE = 28800;

    public static function start(Config $config): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            return;
        }
        $https = ($_SERVER['HTTPS'] ?? '') !== '' && strtolower((string) $_SERVER['HTTPS']) !== 'off';
        // Production is always HTTPS (the CDN may talk to PHP over http, so don't trust the detection there).
        $secure = $config->string('env') === 'production' || $https;
        ini_set('session.use_strict_mode', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.use_trans_sid', '0');
        ini_set('session.cookie_httponly', '1');
        ini_set('session.sid_length', '48');
        ini_set('session.sid_bits_per_character', '6');
        $dir = $config->stateDir() . '/admin-sessions';
        if ((is_dir($dir) || @mkdir($dir, 0700, true)) && is_writable($dir)) {
            session_save_path($dir);
        }
        // Our own no-store header stands (PHP's limiter would add a second Cache-Control).
        session_cache_limiter('');
        session_name($secure ? '__Host-admin' : 'admin_sid');
        session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $secure, 'httponly' => true, 'samesite' => 'Strict']);
        session_start();

        $now = time();
        $expired = isset($_SESSION['seen']) && ($now - (int) $_SESSION['seen'] > self::IDLE || $now - (int) ($_SESSION['since'] ?? $now) > self::MAX_AGE);
        if ($expired) {
            $_SESSION = [];
            session_regenerate_id(true);
            $_SESSION['flash'] = ['info', 'Your session expired. Please sign in again.'];
        }
        $_SESSION['seen'] = $now;
        $_SESSION['since'] ??= $now;
    }

    /** After a successful login: a fresh id and a fresh CSRF token. */
    public static function login(array $user): void
    {
        session_regenerate_id(true);
        $_SESSION = ['user_id' => (int) $user['id'], 'username' => (string) $user['username'], 'seen' => time(), 'since' => time()];
        self::csrfToken();
    }

    public static function logout(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $params['path'], 'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Strict']);
        }
        session_destroy();
    }

    public static function userId(): ?int
    {
        return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
    }

    public static function username(): ?string
    {
        return isset($_SESSION['username']) ? (string) $_SESSION['username'] : null;
    }

    public static function csrfToken(): string
    {
        if (empty($_SESSION['csrf']) || !is_string($_SESSION['csrf'])) {
            $_SESSION['csrf'] = bin2hex(random_bytes(32));
        }
        return $_SESSION['csrf'];
    }

    public static function validCsrf(?string $token): bool
    {
        return is_string($token) && !empty($_SESSION['csrf']) && hash_equals((string) $_SESSION['csrf'], $token);
    }

    public static function flash(string $type, string $message): void
    {
        $_SESSION['flash'] = [$type, $message];
    }

    /** @return array{0: string, 1: string}|null */
    public static function takeFlash(): ?array
    {
        if (session_status() !== PHP_SESSION_ACTIVE) {
            return null;
        }
        $flash = $_SESSION['flash'] ?? null;
        unset($_SESSION['flash']);
        return is_array($flash) ? $flash : null;
    }
}
