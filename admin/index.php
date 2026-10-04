<?php

declare(strict_types=1);

/*
 * /admin: the front controller (F13). Every request goes through, in order:
 * the HTTP Basic gate, the session, the CSRF + Origin check for POSTs, then
 * the route. Pages need a signed-in admin except sign-in, 2FA and first setup.
 */

use Site\Admin\Audit;
use Site\Admin\Auth;
use Site\Admin\Ctx;
use Site\Admin\Growth;
use Site\Admin\Pages;
use Site\Admin\Session;
use Site\Admin\View;
use Site\Db;
use Site\Http;

$config = require __DIR__ . '/lib/boot.php';

$pdo = $config->hasDatabase() ? Db::tryConnect($config) : null;
if ($pdo === null || !$config->hasSecret()) {
    http_response_code(503);
    View::page('Admin unavailable', '<p>The database or the app secret isn\'t configured yet. See "First backend deploy" in docs/SETUP.md.</p>');
}
try {
    $pdo->query('SELECT 1 FROM admin_users LIMIT 1');
} catch (Throwable $error) {
    http_response_code(503);
    View::page('Admin not migrated', '<p>Run the database migrations first: <code>POST /api/migrate.php</code> with the admin token (docs/SETUP.md).</p>');
}

$ipHash = Http::ipHash($config, Http::clientIp($config));
$auth = new Auth($config, $pdo, $ipHash);
$auth->requireGate();
Session::start($config);
$audit = new Audit($pdo, $ipHash);
$ctx = new Ctx($config, $pdo, $auth, $audit, $ipHash);

$path = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/admin/'), PHP_URL_PATH);
$path = '/' . trim((string) preg_replace('#^/admin#', '', $path), '/');
$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));

if ($method === 'POST') {
    // Same-origin only: a cross-site form post has a foreign Origin (or the wrong token).
    $origin = (string) ($_SERVER['HTTP_ORIGIN'] ?? '');
    $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
    $sameOrigin = true;
    if ($origin !== '') {
        $parts = parse_url($origin) ?: [];
        $sameOrigin = ($parts['host'] ?? '') . (isset($parts['port']) ? ':' . $parts['port'] : '') === $host;
    }
    if (!$sameOrigin || !Session::validCsrf($_POST['_csrf'] ?? null)) {
        $audit->log('csrf.rejected', null, null, $method . ' ' . mb_substr($path, 0, 100));
        http_response_code(403);
        View::page('Request refused', '<p>This form expired or didn\'t come from this site. <a href="' . View::url($path === '/login' ? '/login' : '/') . '">Reload the page</a> and try again.</p>');
    }
} elseif ($method !== 'GET' && $method !== 'HEAD') {
    http_response_code(405);
    header('Allow: GET, POST');
    exit;
}

$public = ['/login', '/2fa', '/setup'];
if (!in_array($path, $public, true)) {
    if (!$auth->hasUsers()) {
        View::redirect('/setup');
    }
    $user = Session::userId() !== null ? $auth->user((int) Session::userId()) : null;
    if ($user === null) {
        Session::logout();
        Session::start($config);
        View::redirect('/login');
    }
    $ctx->user = $user;
}

$routes = [
    'GET /login' => [Pages::class, 'loginForm'],
    'POST /login' => [Pages::class, 'login'],
    'GET /2fa' => [Pages::class, 'totpForm'],
    'POST /2fa' => [Pages::class, 'totp'],
    'GET /setup' => [Pages::class, 'setupForm'],
    'POST /setup' => [Pages::class, 'setup'],
    'POST /logout' => [Pages::class, 'logout'],
    'GET /' => [Pages::class, 'overview'],
    'GET /leads' => [Pages::class, 'leads'],
    'GET /leads.csv' => [Pages::class, 'leadsCsv'],
    'GET /subscribers' => [Pages::class, 'subscribers'],
    'GET /subscribers.csv' => [Pages::class, 'subscribersCsv'],
    'GET /bookings' => [Pages::class, 'bookings'],
    'GET /scans' => [Growth::class, 'scans'],
    'GET /magnets' => [Growth::class, 'magnets'],
    'GET /ask' => [Growth::class, 'askLog'],
    'GET /neuralforge' => [Growth::class, 'neuralforge'],
    'GET /audit' => [Pages::class, 'auditLog'],
    'GET /settings' => [Pages::class, 'settings'],
    'POST /settings/password' => [Pages::class, 'changePassword'],
    'POST /settings/email' => [Pages::class, 'changeEmail'],
    'POST /settings/totp' => [Pages::class, 'enableTotp'],
    'POST /settings/totp/confirm' => [Pages::class, 'confirmTotp'],
    'POST /settings/totp/disable' => [Pages::class, 'disableTotp'],
];
$key = ($method === 'HEAD' ? 'GET' : $method) . ' ' . $path;
if (isset($routes[$key])) {
    call_user_func($routes[$key], $ctx);
    exit;
}
// Routes with an id
$patterns = [
    'GET #^/leads/(\d+)$#' => [Pages::class, 'lead'],
    'POST #^/leads/(\d+)/status$#' => [Pages::class, 'leadStatus'],
    'POST #^/leads/(\d+)/notes$#' => [Pages::class, 'leadNote'],
    'POST #^/leads/(\d+)/delete$#' => [Pages::class, 'leadDelete'],
    'POST #^/subscribers/(\d+)/resync$#' => [Pages::class, 'subscriberResync'],
    'POST #^/subscribers/(\d+)/delete$#' => [Pages::class, 'subscriberDelete'],
    'GET #^/scans/(\d+)$#' => [Growth::class, 'scan'],
    'POST #^/scans/(\d+)/dispatch$#' => [Growth::class, 'scanDispatch'],
];
foreach ($patterns as $pattern => $handler) {
    [$verb, $regex] = explode(' ', $pattern, 2);
    if ($verb === ($method === 'HEAD' ? 'GET' : $method) && preg_match($regex, $path, $match)) {
        call_user_func($handler, $ctx, (int) $match[1]);
        exit;
    }
}
http_response_code(404);
View::page('Not found', '<p>No admin page here. <a href="' . View::url('/') . '">Back to the overview</a>.</p>', Session::userId() !== null ? '' : null);
