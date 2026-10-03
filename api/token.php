<?php

declare(strict_types=1);

/*
 * GET /api/token.php?form=contact: a signed form token for the public forms.
 * The page asks for one when a form is first used and sends it back with the
 * submission (see FormToken for the rules).
 */

use Site\FormToken;
use Site\Http;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('GET');
Http::requireAllowedOrigin($config);

$form = (string) ($_GET['form'] ?? '');
if (!in_array($form, ['contact', 'subscribe'], true)) {
    Http::error(400, 'unknown_form', 'Unknown form.');
}

Http::json(200, [
    'ok' => true,
    'token' => (new FormToken($config))->issue($form),
    'min_age' => FormToken::MIN_AGE,
]);
