<?php

declare(strict_types=1);

namespace Site\Admin;

use PDO;

/*
 * Login lockout: 5 failed tries in 15 minutes locks the IP, and separately the
 * username (so a botnet can't spread guesses over many IPs). Only failures
 * since the last success count. Every attempt is kept in login_attempts.
 */
final class LoginThrottle
{
    public const MAX_FAILURES = 5;
    public const WINDOW = 900;

    public function __construct(private PDO $pdo)
    {
    }

    /** @return array{locked: bool, retry_after: int} */
    public function check(string $ipHash, string $username, ?int $now = null): array
    {
        $now ??= time();
        $retry = max($this->retryAfter('ip_hash', $ipHash, $now), $this->retryAfter('username', $this->key($username), $now));
        return ['locked' => $retry > 0, 'retry_after' => $retry];
    }

    public function record(string $ipHash, string $username, bool $success, ?int $now = null): void
    {
        $this->pdo->prepare(
            'INSERT INTO login_attempts (ip_hash, username, success, attempted_at) VALUES (:ip, :user, :success, :at)'
        )->execute([
            'ip' => $ipHash,
            'user' => $this->key($username),
            'success' => $success ? 1 : 0,
            'at' => gmdate('Y-m-d H:i:s', $now ?? time()),
        ]);
    }

    private function key(string $username): string
    {
        return mb_substr(strtolower(trim($username)), 0, 60);
    }

    /** Seconds until this IP/username may try again (0 = not locked). */
    private function retryAfter(string $column, string $value, int $now): int
    {
        $since = gmdate('Y-m-d H:i:s', $now - self::WINDOW);
        $statement = $this->pdo->prepare(
            "SELECT attempted_at FROM login_attempts
             WHERE {$column} = :value AND success = 0 AND attempted_at > :since
               AND attempted_at > COALESCE((SELECT MAX(attempted_at) FROM login_attempts s WHERE s.{$column} = :value2 AND s.success = 1), '1970-01-01')
             ORDER BY attempted_at DESC LIMIT " . self::MAX_FAILURES
        );
        $statement->execute(['value' => $value, 'since' => $since, 'value2' => $value]);
        $failures = $statement->fetchAll(PDO::FETCH_COLUMN);
        if (count($failures) < self::MAX_FAILURES) {
            return 0;
        }
        // Locked until the oldest of the last five failures leaves the window.
        $oldest = strtotime(end($failures) . ' UTC');
        return max(1, $oldest + self::WINDOW - $now);
    }
}
