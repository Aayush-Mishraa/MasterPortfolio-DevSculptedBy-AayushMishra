<?php

declare(strict_types=1);

namespace Site\Tests\Integration;

use PDO;
use PHPUnit\Framework\TestCase;
use Site\Config;
use Site\Db;
use Site\Migrator;
use Site\RateLimit;

/** Migrations and the rate limiter against a real MySQL (TEST_DB_*). */
final class DatabaseTest extends TestCase
{
    private static ?PDO $pdo = null;

    public static function setUpBeforeClass(): void
    {
        if (test_env('TEST_DB_NAME') === '') {
            return;
        }
        Db::reset();
        self::$pdo = Db::connect(Config::fromArray(test_config()));
    }

    protected function setUp(): void
    {
        if (self::$pdo === null) {
            $this->markTestSkipped('TEST_DB_NAME is not set');
        }
    }

    private function dropAll(): void
    {
        self::$pdo->exec('SET FOREIGN_KEY_CHECKS = 0');
        foreach (self::$pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN) as $table) {
            self::$pdo->exec('DROP TABLE `' . str_replace('`', '', $table) . '`');
        }
        self::$pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
    }

    public function testMigrationsApplyOnceInOrder(): void
    {
        $this->dropAll();
        $migrator = new Migrator(self::$pdo, __DIR__ . '/../../migrations');
        $this->assertSame($migrator->available(), $migrator->pending());
        $this->assertContains('001_init.sql', $migrator->migrate());
        $this->assertSame([], $migrator->pending());
        $this->assertSame([], $migrator->migrate(), 'a second run applies nothing');

        $tables = self::$pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
        foreach (['leads', 'subscribers', 'rate_limits', 'webhook_events', 'schema_migrations'] as $table) {
            $this->assertContains($table, $tables);
        }
    }

    /** @depends testMigrationsApplyOnceInOrder */
    public function testRateLimitInTheDatabase(): void
    {
        $limiter = new RateLimit(Config::fromArray(test_config()), self::$pdo);
        $key = 'ip-' . bin2hex(random_bytes(4));
        $now = 1_700_000_000;
        $this->assertTrue($limiter->hit('test', $key, [60 => 2], $now)['allowed']);
        $this->assertTrue($limiter->hit('test', $key, [60 => 2], $now + 1)['allowed']);
        $third = $limiter->hit('test', $key, [60 => 2], $now + 2);
        $this->assertFalse($third['allowed']);
        $this->assertGreaterThan(0, $third['retry_after']);
        $this->assertTrue($limiter->hit('test', $key, [60 => 2], $now + 61)['allowed'], 'a new window starts fresh');
        $this->assertTrue($limiter->hit('test', 'someone-else', [60 => 2], $now + 2)['allowed']);
    }

    public function testRateLimitFallsBackToFiles(): void
    {
        $limiter = new RateLimit(Config::fromArray(test_config()), null);
        $key = 'file-' . bin2hex(random_bytes(4));
        $now = 1_700_000_000;
        $this->assertTrue($limiter->hit('test', $key, [60 => 1], $now)['allowed']);
        $this->assertFalse($limiter->hit('test', $key, [60 => 1], $now + 1)['allowed']);
    }
}
