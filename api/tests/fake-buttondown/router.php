<?php

/*
 * A stand-in for api.buttondown.com in tests (php -S ... router.php).
 *   POST /v1/subscribers     201, or 400 when the address contains "exists" /
 *                            "reject", or 503 when it contains "down"
 *   GET  /v1/subscribers/ID  an "ext-..." id resolves to an address; a "sub-..."
 *                            id (made by POST) is a confirmed ("regular") subscriber
 *   DELETE /v1/subscribers/ID  204
 *   GET  /__requests         every request received so far (JSON)
 * Requires "Authorization: Token test-buttondown-key".
 */

$log = sys_get_temp_dir() . '/fake-buttondown.jsonl';
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
header('Content-Type: application/json');

if ($path === '/__requests') {
    $lines = is_file($log) ? file($log, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) : [];
    echo '[' . implode(',', $lines) . ']';
    return true;
}

$body = file_get_contents('php://input');
$auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
file_put_contents($log, json_encode(['method' => $method, 'path' => $path, 'auth' => $auth, 'body' => json_decode((string) $body, true)]) . "\n", FILE_APPEND | LOCK_EX);

if ($auth !== 'Token test-buttondown-key') {
    http_response_code(401);
    echo json_encode(['detail' => 'Invalid token.']);
    return true;
}

if ($method === 'POST' && $path === '/v1/subscribers') {
    $data = json_decode((string) $body, true) ?: [];
    $email = (string) ($data['email_address'] ?? '');
    if (str_contains($email, 'down')) {
        http_response_code(503);
        echo json_encode(['detail' => 'Service unavailable']);
    } elseif (str_contains($email, 'exists')) {
        http_response_code(400);
        echo json_encode(['code' => 'email_already_exists', 'detail' => 'This email address is already subscribed.']);
    } elseif (str_contains($email, 'reject')) {
        http_response_code(400);
        echo json_encode(['code' => 'email_invalid', 'detail' => 'That email address is not valid.']);
    } else {
        http_response_code(201);
        echo json_encode(['id' => 'sub-' . substr(hash('sha256', $email), 0, 24), 'email_address' => $email, 'type' => 'unactivated']);
    }
    return true;
}

if ($method === 'GET' && preg_match('#^/v1/subscribers/(sub-[A-Za-z0-9-]+)$#', $path, $match)) {
    echo json_encode(['id' => $match[1], 'email_address' => null, 'type' => 'regular']);
    return true;
}

if ($method === 'DELETE' && preg_match('#^/v1/subscribers/([A-Za-z0-9-]+)$#', $path)) {
    http_response_code(204);
    return true;
}

if ($method === 'GET' && preg_match('#^/v1/subscribers/(ext-[A-Za-z0-9-]+)$#', $path, $match)) {
    echo json_encode(['id' => $match[1], 'email_address' => $match[1] . '@example.com', 'type' => 'regular']);
    return true;
}

http_response_code(404);
echo json_encode(['detail' => 'Not found.']);
return true;
