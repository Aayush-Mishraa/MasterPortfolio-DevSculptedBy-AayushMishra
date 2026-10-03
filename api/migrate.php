<?php

declare(strict_types=1);

/*
 * POST /api/migrate.php (admin token): applies pending migrations.
 * The deploy workflow calls it after each upload; it is safe to call again.
 */

use Site\Db;
use Site\Http;
use Site\Migrator;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('POST');
Http::requireAdmin($config);

if (!$config->hasDatabase()) {
    Http::error(503, 'not_configured', 'The database is not configured.');
}

$migrator = new Migrator(Db::connect($config), __DIR__ . '/migrations');
$applied = $migrator->migrate();

Http::json(200, [
    'ok' => true,
    'applied' => $applied,
    'pending' => $migrator->pending(),
    'all' => $migrator->applied(),
]);
