<?php

declare(strict_types=1);

namespace Site;

use PDO;

/*
 * Fixed-window rate limiting per (bucket, key). Counts live in MySQL
 * (rate_limits); if the database is down they fall back to small files in the
 * private state folder, so a broken database never turns the limit off.
 */
final class RateLimit
{
    public function __construct(private Config $config, private ?PDO $pdo)
    {
    }

    /**
     * Records a hit and reports whether it is within every limit.
     *
     * @param array<int, int> $limits window seconds => max hits, e.g. [600 => 3, 86400 => 10]
     * @return array{allowed: bool, retry_after: int}
     */
    public function hit(string $bucket, string $key, array $limits, ?int $now = null): array
    {
        $now ??= time();
        $keyHash = hash('sha256', $key);
        $retryAfter = 0;
        $allowed = true;
        foreach ($limits as $window => $max) {
            $start = intdiv($now, $window) * $window;
            $hits = $this->increment($bucket . ':' . $window, $keyHash, $start, $window);
            if ($hits > $max) {
                $allowed = false;
                $retryAfter = max($retryAfter, $start + $window - $now);
            }
        }
        if (random_int(1, 50) === 1) {
            $this->prune($now);
        }
        return ['allowed' => $allowed, 'retry_after' => $retryAfter];
    }

    private function increment(string $bucket, string $keyHash, int $start, int $window): int
    {
        if ($this->pdo !== null) {
            try {
                $this->pdo->prepare(
                    'INSERT INTO rate_limits (bucket, key_hash, window_start, hits, expires_at)
                     VALUES (:bucket, :key_hash, :window_start, 1, :expires_at)
                     ON DUPLICATE KEY UPDATE hits = hits + 1'
                )->execute([
                    'bucket' => $bucket,
                    'key_hash' => $keyHash,
                    'window_start' => $start,
                    'expires_at' => $start + $window,
                ]);
                $statement = $this->pdo->prepare(
                    'SELECT hits FROM rate_limits WHERE bucket = :bucket AND key_hash = :key_hash AND window_start = :window_start'
                );
                $statement->execute(['bucket' => $bucket, 'key_hash' => $keyHash, 'window_start' => $start]);
                return (int) $statement->fetchColumn();
            } catch (\Throwable $error) {
                error_log('[api] rate limit falls back to files: ' . $error->getMessage());
            }
        }
        return $this->incrementFile($bucket, $keyHash, $start);
    }

    private function incrementFile(string $bucket, string $keyHash, int $start): int
    {
        $dir = $this->config->stateDir() . '/ratelimit';
        if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
            $dir = sys_get_temp_dir() . '/site-api-ratelimit';
            @mkdir($dir, 0700, true);
        }
        $file = $dir . '/' . hash('sha256', $bucket . '|' . $keyHash . '|' . $start) . '.cnt';
        $handle = @fopen($file, 'c+');
        if ($handle === false) {
            return 1; // can't count: let it through rather than block everyone
        }
        try {
            flock($handle, LOCK_EX);
            $hits = (int) stream_get_contents($handle) + 1;
            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, (string) $hits);
            fflush($handle);
            return $hits;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    private function prune(int $now): void
    {
        if ($this->pdo !== null) {
            try {
                $this->pdo->prepare('DELETE FROM rate_limits WHERE expires_at < :now')->execute(['now' => $now - 86400]);
            } catch (\Throwable $error) {
                // pruning is housekeeping only
            }
        }
        $dir = $this->config->stateDir() . '/ratelimit';
        foreach (glob($dir . '/*.cnt') ?: [] as $file) {
            if (@filemtime($file) < $now - 2 * 86400) {
                @unlink($file);
            }
        }
    }
}
