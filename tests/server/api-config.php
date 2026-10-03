<?php

// API settings for the local Docker stack (tests/server/docker-compose.yml).
// Test values only: nothing here is a real secret.

return [
    'env' => 'test',
    'site_url' => 'http://localhost:8080',
    'allowed_origins' => ['http://localhost:8080', 'http://web', 'https://aayushmishra.engineer'],
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
    // Tests set X-Forwarded-For to act as different visitors.
    'client_ip_header' => 'HTTP_X_FORWARDED_FOR',
    'state_dir' => '/tmp/site-api-state',
];
