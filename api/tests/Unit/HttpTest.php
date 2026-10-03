<?php

declare(strict_types=1);

namespace Site\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Site\Config;
use Site\Http;
use Site\HttpExit;
use Site\Migrator;

final class HttpTest extends TestCase
{
    private array $server;

    protected function setUp(): void
    {
        $this->server = $_SERVER;
    }

    protected function tearDown(): void
    {
        $_SERVER = $this->server;
    }

    public function testClientIpUsesTheLastForwardedAddressOnlyWhenConfigured(): void
    {
        $_SERVER['REMOTE_ADDR'] = '10.0.0.5';
        $_SERVER['HTTP_X_FORWARDED_FOR'] = '6.6.6.6, 203.0.113.9';

        $this->assertSame('10.0.0.5', Http::clientIp(Config::fromArray(test_config())));
        $this->assertSame('203.0.113.9', Http::clientIp(Config::fromArray(test_config(['client_ip_header' => 'HTTP_X_FORWARDED_FOR']))));

        $_SERVER['HTTP_X_FORWARDED_FOR'] = 'not-an-ip';
        $this->assertSame('10.0.0.5', Http::clientIp(Config::fromArray(test_config(['client_ip_header' => 'HTTP_X_FORWARDED_FOR']))));
    }

    public function testForeignOriginIsRejected(): void
    {
        $_SERVER['HTTP_ORIGIN'] = 'https://evil.example';
        $exit = $this->expectExit(403, static fn () => Http::requireAllowedOrigin(Config::fromArray(test_config())));
        $this->assertSame('origin_not_allowed', $exit->data['error']);

        $_SERVER['HTTP_ORIGIN'] = 'null';
        $this->expectExit(403, static fn () => Http::requireAllowedOrigin(Config::fromArray(test_config())));
    }

    public function testOwnOriginAndNoOriginPass(): void
    {
        $_SERVER['HTTP_ORIGIN'] = 'https://aayushmishra.engineer';
        Http::requireAllowedOrigin(Config::fromArray(test_config()));
        unset($_SERVER['HTTP_ORIGIN']);
        Http::requireAllowedOrigin(Config::fromArray(test_config()));
        $this->addToAssertionCount(1);
    }

    public function testReadJsonRejectsWrongTypeAndOversizedBodies(): void
    {
        $_SERVER['CONTENT_TYPE'] = 'text/plain';
        $this->expectExit(415, static fn () => Http::readJson(100, '{}'));

        $_SERVER['CONTENT_TYPE'] = 'application/json';
        $this->expectExit(413, static fn () => Http::readJson(10, str_repeat(' ', 11)));
        $this->expectExit(400, static fn () => Http::readJson(100, '[1,2]'));
        $this->expectExit(400, static fn () => Http::readJson(100, '{bad'));
        $this->assertSame(['a' => 1], Http::readJson(100, '{"a":1}'));
    }

    public function testAdminTokenNeedsAnExactMatch(): void
    {
        $config = Config::fromArray(test_config());
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer test-admin-token-0123456789abcdef';
        $this->assertTrue(Http::isAdmin($config));
        $_SERVER['HTTP_AUTHORIZATION'] = 'Bearer test-admin-token-0123456789abcdeX';
        $this->assertFalse(Http::isAdmin($config));
        $this->assertFalse(Http::isAdmin(Config::fromArray(test_config(['admin_token' => 'short']))));
    }

    public function testMigrationStatementsSplitOnLineEndSemicolons(): void
    {
        $sql = "-- comment\nCREATE TABLE a (x INT);\n\nCREATE TABLE b (\n y INT\n);\n";
        $this->assertSame(['CREATE TABLE a (x INT)', "CREATE TABLE b (\n y INT\n)"], Migrator::statements($sql));
    }

    private function expectExit(int $status, callable $call): HttpExit
    {
        ob_start();
        try {
            $call();
        } catch (HttpExit $exit) {
            $this->assertSame($status, $exit->status);
            return $exit;
        } finally {
            ob_end_clean();
        }
        $this->fail("expected HTTP {$status}");
    }
}
