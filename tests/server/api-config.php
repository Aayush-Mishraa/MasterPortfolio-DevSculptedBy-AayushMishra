<?php

// API settings for the local Docker stack (tests/server/docker-compose.yml).
// Test values only: nothing here is a real secret.

return [
    'env' => 'test',
    'site_url' => 'http://localhost:8080',
    // localhost:3000 = `npm start`, whose dev server proxies /api here (src/setupProxy.js)
    'allowed_origins' => ['http://localhost:8080', 'http://localhost:3000', 'http://web', 'https://aayushmishra.engineer'],
    'app_secret' => 'local-test-secret-0123456789abcdef0123456789',
    'admin_token' => 'test-admin-token-0123456789abcdef',
    'db' => [
        'host' => 'db',
        'port' => 3306,
        'name' => 'portfolio',
        'user' => 'portfolio',
        'pass' => 'portfolio',
    ],
    'smtp' => [
        'host' => 'mail',
        'port' => 1025,
        'secure' => '',
        'user' => '',
        'pass' => '',
        'from' => 'contact@aayushmishra.engineer',
        'from_name' => 'aayushmishra.engineer',
    ],
    'mail_to' => 'contact@aayushmishra.engineer',
    'buttondown' => [
        'api_key' => 'test-buttondown-key',
        'webhook_secret' => 'local-buttondown-webhook-secret',
        'api_base' => 'http://buttondown:8090/v1', // the fake in api/tests/fake-buttondown
    ],
    'cal' => [
        'webhook_secret' => 'local-cal-webhook-secret',
    ],
    // F13: the /admin Basic gate for the local stack: user "gate", password "local-gate-password".
    'admin' => [
        'basic_user' => 'gate',
        'basic_pass_hash' => '$2y$10$L62ls9BcAm9U7OZO3a/ige2uBnMuVsOxTcKIrBEjboNWbeRLhRoUq',
    ],
    // Stage 3 + 4: no GitHub token locally (scans stay "waiting"), a known callback
    // secret to sign test callbacks, no Claude key (the assistant answers with passages).
    'scanner' => [
        'github_token' => '',
        'callback_secret' => 'local-scan-callback-secret-0123456789abcdef',
        'daily_cap' => 30,
    ],
    'anthropic' => ['api_key' => '', 'model' => 'claude-haiku-4-5', 'daily_cap' => 200],
    'neuralforge' => ['url' => 'http://localhost:8080/neuralforge'],
    // Tests set X-Forwarded-For to act as different visitors.
    'client_ip_header' => 'HTTP_X_FORWARDED_FOR',
    'state_dir' => '/tmp/site-api-state',
];
