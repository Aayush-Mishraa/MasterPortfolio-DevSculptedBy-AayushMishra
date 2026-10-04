<?php

declare(strict_types=1);

namespace Site;

use PDO;

/*
 * F24: starts scan jobs on GitHub Actions and reads their results.
 *
 * scan.php saves a request and calls dispatch(): a repository_dispatch event
 * ("site-scan") on this site's repository, authenticated with a fine-grained
 * token that may only do that. The workflow (.github/workflows/site-scan.yml)
 * runs the checks and POSTs report.json back to scan-callback.php, signed
 * with HMAC-SHA256(callback_secret, "<timestamp>.<body>").
 */
final class Scanner
{
    public function __construct(private Config $config)
    {
    }

    public function configured(): bool
    {
        return $this->config->string('scanner.github_token') !== ''
            && $this->config->string('scanner.repo') !== ''
            && strlen($this->config->string('scanner.callback_secret')) >= 32;
    }

    /** Starts the job. @return bool true when GitHub accepted the event */
    public function dispatch(string $publicId, string $url): bool
    {
        if (!$this->configured()) {
            return false;
        }
        $base = $this->config->string('scanner.api_base') ?: 'https://api.github.com';
        $response = HttpClient::request('POST', rtrim($base, '/') . '/repos/' . $this->config->string('scanner.repo') . '/dispatches', [
            'Authorization' => 'Bearer ' . $this->config->string('scanner.github_token'),
            'Accept' => 'application/vnd.github+json',
            'X-GitHub-Api-Version' => '2022-11-28',
            'Content-Type' => 'application/json',
        ], json_encode([
            'event_type' => 'site-scan',
            'client_payload' => [
                'scan_id' => $publicId,
                'url' => $url,
                'callback' => rtrim($this->config->string('site_url'), '/') . '/api/scan-callback.php',
            ],
        ], JSON_UNESCAPED_SLASHES), 15);
        if ($response['status'] !== 204) {
            error_log('[api] scanner: dispatch failed with HTTP ' . $response['status'] . ' ' . mb_substr($response['body'], 0, 200));
            return false;
        }
        return true;
    }

    public function validSignature(string $body, string $timestamp, string $signature, ?int $now = null): bool
    {
        $secret = $this->config->string('scanner.callback_secret');
        if (strlen($secret) < 32 || !ctype_digit($timestamp) || abs(($now ?? time()) - (int) $timestamp) > 300) {
            return false;
        }
        $expected = hash_hmac('sha256', $timestamp . '.' . $body, $secret);
        return hash_equals($expected, strtolower(preg_replace('/^sha256=/i', '', trim($signature))));
    }

    public static function newId(): string
    {
        return bin2hex(random_bytes(12));
    }

    /** @return array<string, mixed>|null */
    public static function find(PDO $pdo, string $publicId): ?array
    {
        if (!preg_match('/^[a-f0-9]{24}$/', $publicId)) {
            return null;
        }
        $statement = $pdo->prepare('SELECT * FROM scans WHERE public_id = :id');
        $statement->execute(['id' => $publicId]);
        $row = $statement->fetch(PDO::FETCH_ASSOC);
        return $row ?: null;
    }

    /** "14 passed · 3 failed · NOT SIGNED OFF" */
    public static function verdict(int $passed, int $failed): string
    {
        return "{$passed} passed · {$failed} failed · " . ($failed === 0 ? 'SIGNED OFF ✓' : 'NOT SIGNED OFF');
    }

    public function reportUrl(string $publicId): string
    {
        return rtrim($this->config->string('site_url'), '/') . '/free-tools/site-scanner/report?id=' . $publicId;
    }

    public function badgeUrl(string $publicId): string
    {
        return rtrim($this->config->string('site_url'), '/') . '/api/badge.php?id=' . $publicId;
    }
}
