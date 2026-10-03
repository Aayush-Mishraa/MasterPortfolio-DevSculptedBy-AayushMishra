<?php

declare(strict_types=1);

namespace Site\Tests\Integration;

use PDO;
use PHPUnit\Framework\TestCase;
use Site\Config;
use Site\Db;
use Site\FormToken;

/**
 * Base for tests that call a running API (API_BASE_URL). Each test can act as
 * its own visitor (a fresh X-Forwarded-For), mint form tokens with the shared
 * test secret, read the database and search Mailpit.
 */
abstract class ApiTestCase extends TestCase
{
    protected const ADMIN = 'test-admin-token-0123456789abcdef';

    protected string $base;
    protected string $visitorIp;

    protected function setUp(): void
    {
        $this->base = rtrim(test_env('API_BASE_URL'), '/');
        if ($this->base === '') {
            $this->markTestSkipped('API_BASE_URL is not set');
        }
        $this->visitorIp = sprintf('198.51.100.%d', random_int(1, 254));
    }

    protected function origin(): string
    {
        return test_env('TEST_ORIGIN', 'http://web');
    }

    protected function token(string $form, int $ageSeconds = 10): string
    {
        return (new FormToken(Config::fromArray(test_config())))->issue($form, time() - $ageSeconds);
    }

    protected function db(): PDO
    {
        if (test_env('TEST_DB_NAME') === '') {
            $this->markTestSkipped('TEST_DB_NAME is not set');
        }
        Db::reset();
        return Db::connect(Config::fromArray(test_config()));
    }

    /** @return list<array<string, mixed>> Mailpit messages to this address */
    protected function mailTo(string $address): array
    {
        $mailpit = rtrim(test_env('MAILPIT_URL'), '/');
        if ($mailpit === '') {
            $this->markTestSkipped('MAILPIT_URL is not set');
        }
        $found = json_decode((string) file_get_contents($mailpit . '/api/v1/search?query=' . rawurlencode($address)), true);
        return $found['messages'] ?? [];
    }

    /** @return array<string, mixed> one Mailpit message in full */
    protected function mailMessage(string $id): array
    {
        $mailpit = rtrim(test_env('MAILPIT_URL'), '/');
        return json_decode((string) file_get_contents($mailpit . '/api/v1/message/' . rawurlencode($id)), true);
    }

    /**
     * @param array<string, string> $headers
     * @return array{status: int, headers: array<string, string>, body: string, json: mixed}
     */
    protected function request(string $method, string $path, array $headers = [], ?string $body = null): array
    {
        $headers += ['X-Forwarded-For' => $this->visitorIp];
        $lines = [];
        foreach ($headers as $name => $value) {
            $lines[] = "{$name}: {$value}";
        }
        $context = stream_context_create(['http' => [
            'method' => $method,
            'header' => implode("\r\n", $lines),
            'content' => $body ?? '',
            'ignore_errors' => true,
            'timeout' => 30,
            'follow_location' => 0,
        ]]);
        $response = @file_get_contents($this->base . $path, false, $context);
        $status = 0;
        $parsed = [];
        foreach ($http_response_header ?? [] as $line) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $match)) {
                $status = (int) $match[1];
                $parsed = [];
            } elseif (str_contains($line, ':')) {
                [$name, $value] = explode(':', $line, 2);
                $parsed[strtolower(trim($name))] = trim($value);
            }
        }
        return ['status' => $status, 'headers' => $parsed, 'body' => (string) $response, 'json' => json_decode((string) $response, true)];
    }

    /**
     * @param array<string, mixed> $data
     * @return array{status: int, headers: array<string, string>, body: string, json: mixed}
     */
    protected function postJson(string $path, array $data, array $headers = []): array
    {
        return $this->request('POST', $path, $headers + [
            'Content-Type' => 'application/json',
            'Origin' => $this->origin(),
        ], json_encode($data));
    }
}
