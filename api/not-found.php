<?php

declare(strict_types=1);

// ErrorDocument for /api/: a JSON 404 or 403 instead of the site's HTML page.

require __DIR__ . '/lib/bootstrap.php';

$status = (int) ($_SERVER['REDIRECT_STATUS'] ?? 404);
if ($status === 403) {
    Site\Http::error(403, 'forbidden', 'Not available.');
}
Site\Http::error(404, 'not_found', 'No such endpoint.');
