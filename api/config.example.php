<?php

/*
 * Copy to api/config.php for local development (git-ignored), or let the
 * deploy write it from GitHub secrets (scripts/deploy/write-api-config.php),
 * which puts it outside the web root at domains/aayushmishra.engineer/private/.
 */

return [
    'env' => 'development',
    'site_url' => 'http://localhost:8080',
    'allowed_origins' => ['http://localhost:8080', 'http://localhost:4173', 'http://localhost:3000'],

    // 32+ random characters each: openssl rand -hex 32
    'app_secret' => '',
    'admin_token' => '',

    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'portfolio',
        'user' => 'portfolio',
        'pass' => 'portfolio',
    ],

    // Hostinger: smtp.hostinger.com, 465, ssl, the mailbox address and its password.
    'smtp' => [
        'host' => '127.0.0.1',
        'port' => 1025,
        'secure' => '',
        'user' => '',
        'pass' => '',
        'from' => 'contact@aayushmishra.engineer',
        'from_name' => 'aayushmishra.engineer',
    ],
    'mail_to' => 'contact@aayushmishra.engineer',

    'buttondown' => [
        'api_key' => '',
        'webhook_secret' => '',
    ],

    // '' = REMOTE_ADDR. Behind Hostinger's CDN, check /api/health.php with the
    // admin token and set the header that carries the visitor's IP.
    'client_ip_header' => '',
    'state_dir' => '',
];
