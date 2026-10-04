<?php

declare(strict_types=1);

namespace Site\Admin;

use PDO;
use Site\Config;

/*
 * Who may use /admin.
 *
 * 1. The gate: HTTP Basic credentials from the config (ADMIN_BASIC_USER /
 *    ADMIN_BASIC_PASS, stored as a password_hash). Checked by PHP rather than
 *    an .htpasswd file, because Hostinger's absolute paths aren't known to
 *    the deploy. In production a missing gate locks /admin entirely.
 * 2. The sign-in: an admin user (password_hash) with an optional TOTP code.
 * Both count towards the same lockout (LoginThrottle).
 */
final class Auth
{
    public const STATUSES = ['new' => 'New', 'contacted' => 'Contacted', 'proposal' => 'Proposal', 'won' => 'Won', 'lost' => 'Lost'];
    public const MIN_PASSWORD = 12;
    private const GATE_USER = '#basic-auth';

    public function __construct(private Config $config, private PDO $pdo, private string $ipHash)
    {
    }

    public function throttle(): LoginThrottle
    {
        return new LoginThrottle($this->pdo);
    }

    /** Enforces the HTTP Basic gate; returns only when it's passed (or not configured outside production). */
    public function requireGate(): void
    {
        $user = $this->config->string('admin.basic_user');
        $hash = $this->config->string('admin.basic_pass_hash');
        if ($user === '' || $hash === '') {
            if ($this->config->string('env') === 'production') {
                http_response_code(503);
                echo '<!doctype html><meta charset="utf-8"><title>Admin locked</title><p>The admin is locked until ADMIN_BASIC_USER and ADMIN_BASIC_PASS are set (see docs/SETUP.md).</p>';
                exit;
            }
            return;
        }
        $lock = $this->throttle()->check($this->ipHash, self::GATE_USER);
        if ($lock['locked']) {
            $this->tooMany($lock['retry_after']);
        }
        [$given, $password] = self::basicCredentials();
        if ($given !== null && hash_equals($user, $given) && password_verify((string) $password, $hash)) {
            return;
        }
        if ($given !== null) {
            $this->throttle()->record($this->ipHash, self::GATE_USER, false);
        }
        header('WWW-Authenticate: Basic realm="admin", charset="UTF-8"');
        http_response_code(401);
        echo '<!doctype html><meta charset="utf-8"><title>Sign in</title><p>Authentication required.</p>';
        exit;
    }

    /** @return array{0: ?string, 1: ?string} */
    public static function basicCredentials(): array
    {
        if (isset($_SERVER['PHP_AUTH_USER'])) {
            return [(string) $_SERVER['PHP_AUTH_USER'], (string) ($_SERVER['PHP_AUTH_PW'] ?? '')];
        }
        $header = (string) ($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
        if (stripos($header, 'Basic ') === 0) {
            $decoded = base64_decode(substr($header, 6), true);
            if ($decoded !== false && str_contains($decoded, ':')) {
                [$user, $password] = explode(':', $decoded, 2);
                return [$user, $password];
            }
        }
        return [null, null];
    }

    private function tooMany(int $retryAfter): never
    {
        http_response_code(429);
        header('Retry-After: ' . $retryAfter);
        $minutes = max(1, (int) ceil($retryAfter / 60));
        View::page('Too many attempts', '<p class="adm-flash adm-flash--error" role="alert">Too many failed sign-ins from here. Try again in ' . $minutes . ' minute' . ($minutes === 1 ? '' : 's') . '.</p>');
    }

    public function hasUsers(): bool
    {
        return (int) $this->pdo->query('SELECT COUNT(*) FROM admin_users')->fetchColumn() > 0;
    }

    public function user(int $id): ?array
    {
        $statement = $this->pdo->prepare('SELECT * FROM admin_users WHERE id = :id');
        $statement->execute(['id' => $id]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /**
     * Password step. @return array{status: string, user?: array, retry_after?: int}
     *   status: ok | totp (a code is needed next) | invalid | locked
     */
    public function attempt(string $username, string $password): array
    {
        $username = trim($username);
        $lock = $this->throttle()->check($this->ipHash, $username);
        if ($lock['locked']) {
            return ['status' => 'locked', 'retry_after' => $lock['retry_after']];
        }
        $statement = $this->pdo->prepare('SELECT * FROM admin_users WHERE username = :username');
        $statement->execute(['username' => mb_strtolower($username)]);
        $user = $statement->fetch(PDO::FETCH_ASSOC) ?: null;
        // Same work whether or not the user exists (a real hash of a random, discarded password).
        $hash = $user['password_hash'] ?? '$2y$10$sOkedmMzZVHhAv9Du/bKx.4SwDLAyyTZtmXlyfIIpLxfASG5/xGOi';
        $valid = password_verify($password, $hash) && $user !== null;
        if (!$valid) {
            $this->throttle()->record($this->ipHash, $username, false);
            return ['status' => 'invalid'];
        }
        if (!empty($user['totp_secret'])) {
            return ['status' => 'totp', 'user' => $user];
        }
        $this->succeed($user);
        return ['status' => 'ok', 'user' => $user];
    }

    /** Code step for a user whose password was right. */
    public function attemptTotp(array $user, string $code): array
    {
        $lock = $this->throttle()->check($this->ipHash, (string) $user['username']);
        if ($lock['locked']) {
            return ['status' => 'locked', 'retry_after' => $lock['retry_after']];
        }
        $step = Totp::verify((string) $user['totp_secret'], $code, $user['totp_last_step'] !== null ? (int) $user['totp_last_step'] : null);
        if ($step === null) {
            $this->throttle()->record($this->ipHash, (string) $user['username'], false);
            return ['status' => 'invalid'];
        }
        $this->pdo->prepare('UPDATE admin_users SET totp_last_step = :step WHERE id = :id')->execute(['step' => $step, 'id' => $user['id']]);
        $this->succeed($user);
        return ['status' => 'ok', 'user' => $user];
    }

    private function succeed(array $user): void
    {
        $this->throttle()->record($this->ipHash, (string) $user['username'], true);
        $this->pdo->prepare('UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = :id')->execute(['id' => $user['id']]);
    }

    public static function passwordProblem(string $password, string $confirm): ?string
    {
        if (mb_strlen($password) < self::MIN_PASSWORD) {
            return 'Use at least ' . self::MIN_PASSWORD . ' characters.';
        }
        if (!hash_equals($password, $confirm)) {
            return "The two passwords don't match.";
        }
        return null;
    }

    public function createUser(string $username, string $password): int
    {
        $this->pdo->prepare('INSERT INTO admin_users (username, password_hash, created_at) VALUES (:u, :p, UTC_TIMESTAMP())')
            ->execute(['u' => mb_strtolower(trim($username)), 'p' => password_hash($password, PASSWORD_DEFAULT)]);
        return (int) $this->pdo->lastInsertId();
    }

    public function setPassword(int $userId, string $password): void
    {
        $this->pdo->prepare('UPDATE admin_users SET password_hash = :p WHERE id = :id')
            ->execute(['p' => password_hash($password, PASSWORD_DEFAULT), 'id' => $userId]);
    }

    /** The setup token is the API admin token (API_ADMIN_TOKEN). */
    public function validSetupToken(string $token): bool
    {
        $expected = $this->config->string('admin_token');
        return $expected !== '' && strlen($expected) >= 16 && hash_equals($expected, $token);
    }
}
