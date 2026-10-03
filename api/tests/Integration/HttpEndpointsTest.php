<?php

declare(strict_types=1);

namespace Site\Tests\Integration;

use PHPUnit\Framework\TestCase;

/**
 * The endpoints over real HTTP (API_BASE_URL, e.g. http://web or
 * http://127.0.0.1:8099). API_SERVER=apache adds the checks that need
 * .htaccess (private folders, JSON 404s, cache headers set by the server).
 */
final class HttpEndpointsTest extends TestCase
{
    private const ADMIN = 'test-admin-token-0123456789abcdef';

    private string $base;

    protected function setUp(): void
    {
        $this->base = rtrim(test_env('API_BASE_URL'), '/');
        if ($this->base === '') {
            $this->markTestSkipped('API_BASE_URL is not set');
        }
    }

    /**
     * @param array<string, string> $headers
     * @return array{status: int, headers: array<string, string>, body: string, json: mixed}
     */
    private function request(string $method, string $path, array $headers = [], ?string $body = null): array
    {
        $lines = [];
        foreach ($headers as $name => $value) {
            $lines[] = "{$name}: {$value}";
        }
        $context = stream_context_create(['http' => [
            'method' => $method,
            'header' => implode("\r\n", $lines),
            'content' => $body ?? '',
            'ignore_errors' => true,
            'timeout' => 20,
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

    public function testHealthIsJsonAndNeverCachedOrIndexed(): void
    {
        $response = $this->request('GET', '/api/health.php');
        $this->assertSame(200, $response['status']);
        $this->assertStringStartsWith('application/json', $response['headers']['content-type'] ?? '');
        $this->assertStringContainsString('no-store', $response['headers']['cache-control'] ?? '');
        $this->assertStringContainsString('noindex', $response['headers']['x-robots-tag'] ?? '');
        $this->assertArrayNotHasKey('access-control-allow-origin', $response['headers']);
        $this->assertSame('aayushmishra.engineer api', $response['json']['service']);
        $this->assertArrayNotHasKey('admin', $response['json'], 'no details without the token');
    }

    public function testHealthDetailsNeedTheAdminToken(): void
    {
        $response = $this->request('GET', '/api/health.php', ['Authorization' => 'Bearer ' . self::ADMIN]);
        $this->assertSame(200, $response['status']);
        $this->assertArrayHasKey('admin', $response['json']);
        $this->assertArrayHasKey('client_ip', $response['json']['admin']);
    }

    public function testWrongMethodIs405(): void
    {
        $response = $this->request('POST', '/api/health.php', ['Content-Type' => 'application/json'], '{}');
        $this->assertSame(405, $response['status']);
        $this->assertSame('method_not_allowed', $response['json']['error']);
    }

    public function testMigrateNeedsTheTokenAndIsIdempotent(): void
    {
        $this->assertSame(401, $this->request('POST', '/api/migrate.php')['status']);
        $this->assertSame(401, $this->request('POST', '/api/migrate.php', ['Authorization' => 'Bearer wrong-token-wrong-token-wrong'])['status']);

        $first = $this->request('POST', '/api/migrate.php', ['Authorization' => 'Bearer ' . self::ADMIN]);
        $this->assertSame(200, $first['status'], $first['body']);
        $this->assertSame([], $first['json']['pending']);
        $second = $this->request('POST', '/api/migrate.php', ['Authorization' => 'Bearer ' . self::ADMIN]);
        $this->assertSame([], $second['json']['applied']);

        $health = $this->request('GET', '/api/health.php');
        $this->assertTrue($health['json']['checks']['database']);
        $this->assertTrue($health['json']['checks']['schema']);
    }

    public function testFormTokens(): void
    {
        $response = $this->request('GET', '/api/token.php?form=contact');
        $this->assertSame(200, $response['status']);
        $this->assertMatchesRegularExpression('/^[\w-]+\.[\w-]+$/', $response['json']['token']);

        $this->assertSame(400, $this->request('GET', '/api/token.php?form=nope')['status']);
        $foreign = $this->request('GET', '/api/token.php?form=contact', ['Origin' => 'https://evil.example']);
        $this->assertSame(403, $foreign['status']);
    }

    public function testMailTestSendsThroughSmtp(): void
    {
        $mailpit = rtrim(test_env('MAILPIT_URL'), '/');
        if ($mailpit === '') {
            $this->markTestSkipped('MAILPIT_URL is not set');
        }
        $to = 'mail-test-' . bin2hex(random_bytes(3)) . '@example.com';
        $response = $this->request(
            'POST',
            '/api/mail-test.php',
            ['Authorization' => 'Bearer ' . self::ADMIN, 'Content-Type' => 'application/json'],
            json_encode(['to' => $to])
        );
        $this->assertSame(200, $response['status'], $response['body']);

        $found = json_decode((string) file_get_contents($mailpit . '/api/v1/search?query=' . rawurlencode('to:' . $to)), true);
        $this->assertSame(1, $found['messages_count'] ?? 0);
        $this->assertSame('Test message from aayushmishra.engineer', $found['messages'][0]['Subject']);
    }

    public function testInternalsAreNotReachable(): void
    {
        if (test_env('API_SERVER') !== 'apache') {
            $this->markTestSkipped('needs the .htaccess rules (API_SERVER=apache)');
        }
        foreach (['/api/lib/Config.php', '/api/migrations/001_init.sql', '/api/vendor/autoload.php', '/api/config.example.php', '/api/composer.json', '/api/.htaccess'] as $path) {
            $response = $this->request('GET', $path);
            $this->assertContains($response['status'], [403, 404], "{$path} must not be served");
            $this->assertStringNotContainsString('<?php', $response['body'], "{$path} leaked source");
        }
        $missing = $this->request('GET', '/api/does-not-exist.php');
        $this->assertSame(404, $missing['status']);
        $this->assertSame('not_found', $missing['json']['error'] ?? null);
    }
}
