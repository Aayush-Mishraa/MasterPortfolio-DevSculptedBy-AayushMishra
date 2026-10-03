<?php

declare(strict_types=1);

namespace Site;

use PDO;

/*
 * Applies api/migrations/NNN_name.sql in order, once each, and records them in
 * schema_migrations. Statements are split on a semicolon at the end of a line,
 * so a migration must not put one inside a string.
 */
final class Migrator
{
    public function __construct(private PDO $pdo, private string $dir)
    {
    }

    /** @return list<string> every migration file name, in order */
    public function available(): array
    {
        $files = glob(rtrim($this->dir, '/') . '/*.sql') ?: [];
        $names = array_map('basename', $files);
        sort($names, SORT_STRING);
        return array_values(array_filter($names, static fn ($name) => (bool) preg_match('/^\d{3}_[a-z0-9_]+\.sql$/', $name)));
    }

    /** @return list<string> */
    public function applied(): array
    {
        $this->ensureTable();
        return $this->pdo->query('SELECT version FROM schema_migrations ORDER BY version')->fetchAll(PDO::FETCH_COLUMN);
    }

    /** @return list<string> */
    public function pending(): array
    {
        return array_values(array_diff($this->available(), $this->applied()));
    }

    /** @return list<string> the migrations applied by this call */
    public function migrate(): array
    {
        $done = [];
        foreach ($this->pending() as $name) {
            $sql = (string) file_get_contents(rtrim($this->dir, '/') . '/' . $name);
            foreach (self::statements($sql) as $statement) {
                $this->pdo->exec($statement);
            }
            $this->pdo->prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (:version, UTC_TIMESTAMP())')
                ->execute(['version' => $name]);
            $done[] = $name;
        }
        return $done;
    }

    private function ensureTable(): void
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS schema_migrations (
                version VARCHAR(100) NOT NULL PRIMARY KEY,
                applied_at DATETIME NOT NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    }

    /** @return list<string> */
    public static function statements(string $sql): array
    {
        $sql = (string) preg_replace('/^\s*--.*$/m', '', $sql);
        $parts = preg_split('/;\s*$/m', $sql) ?: [];
        return array_values(array_filter(array_map('trim', $parts), static fn ($part) => $part !== ''));
    }
}
