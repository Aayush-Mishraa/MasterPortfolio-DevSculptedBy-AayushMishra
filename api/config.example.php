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

    // F12: Cal.com → Settings → Developer → Webhooks → "Secret" (signs x-cal-signature-256).
    'cal' => [
        'webhook_secret' => '',
    ],

    // F13: the HTTP Basic gate in front of /admin; empty = no gate (allowed only outside production).
    // basic_pass_hash: php -r 'echo password_hash("your-gate-password", PASSWORD_DEFAULT);'
    'admin' => [
        'basic_user' => '',
        'basic_pass_hash' => '',
    ],

    // F24: the scanner. github_token: a fine-grained PAT for this repo with "Contents: read
    // and write" (it only sends repository_dispatch). callback_secret: openssl rand -hex 32,
    // the same value as the SCAN_CALLBACK_SECRET Actions secret.
    'scanner' => [
        'github_token' => '',
        'callback_secret' => '',
        'daily_cap' => 30,
    ],

    // F31: the site assistant (Claude Haiku 4.5). Empty key = answers are the matching passages.
    'anthropic' => [
        'api_key' => '',
        'model' => 'claude-haiku-4-5',
        'daily_cap' => 200,
    ],

    // F30: where NeuralForge's sign-in links point. Locally the build serves it at /neuralforge/.
    'neuralforge' => [
        'url' => 'http://localhost:8080/neuralforge',
    ],

    // '' = REMOTE_ADDR. Behind Hostinger's CDN, check /api/health.php with the
    // admin token and set the header that carries the visitor's IP.
    'client_ip_header' => '',
    'state_dir' => '',
];
