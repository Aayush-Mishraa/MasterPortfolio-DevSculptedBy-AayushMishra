<?php

declare(strict_types=1);

namespace Site\Admin;

use PDO;
use Site\Config;

/** What every admin page gets: config, database, auth, audit log and the signed-in user. */
final class Ctx
{
    public ?array $user = null;

    public function __construct(
        public Config $config,
        public PDO $pdo,
        public Auth $auth,
        public Audit $audit,
        public string $ipHash,
    ) {
    }

    /** One value from a query. */
    public function value(string $sql, array $params = []): mixed
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetchColumn();
    }

    /** @return list<array<string, mixed>> */
    public function rows(string $sql, array $params = []): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    public function post(string $name): string
    {
        $value = $_POST[$name] ?? '';
        return is_string($value) ? $value : '';
    }

    public function query(string $name): string
    {
        $value = $_GET[$name] ?? '';
        return is_string($value) ? trim($value) : '';
    }
}
