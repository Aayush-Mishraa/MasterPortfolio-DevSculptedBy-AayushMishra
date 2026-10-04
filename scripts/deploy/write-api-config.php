<?php

/*
 * Writes the API's config.php from environment variables (GitHub secrets in
 * the deploy workflow). Values are exported with var_export, so any character
 * in a secret is safe. Prints which settings are present, never their values.
 *
 *   php scripts/deploy/write-api-config.php <output-file>
 */

declare(strict_types=1);

$out = $argv[1] ?? '';
if ($out === '') {
    fwrite(STDERR, "usage: php write-api-config.php <output-file>\n");
    exit(2);
}

$env = static fn (string $name, string $default = ''): string => trim((string) (getenv($name) === false ? $default : getenv($name)));

$config = [
    // The staging deploy sets SITE_ENV=staging, SITE_URL and ALLOWED_ORIGINS.
    'env' => $env('SITE_ENV', 'production'),
    'site_url' => $env('SITE_URL', 'https://aayushmishra.engineer'),
    // F30: NeuralForge's subdomain calls the sync API same-origin, so it's an allowed origin too.
    'allowed_origins' => $env('ALLOWED_ORIGINS') !== ''
        ? array_values(array_filter(array_map('trim', explode(',', $env('ALLOWED_ORIGINS')))))
        : ['https://aayushmishra.engineer', 'https://www.aayushmishra.engineer', 'https://neuralforge.aayushmishra.engineer'],
    'app_secret' => $env('API_APP_SECRET'),
    'admin_token' => $env('API_ADMIN_TOKEN'),
    'db' => [
        'host' => $env('DB_HOST', 'localhost'),
        'port' => (int) $env('DB_PORT', '3306'),
        'name' => $env('DB_NAME'),
        'user' => $env('DB_USER'),
        'pass' => $env('DB_PASS'),
        'charset' => 'utf8mb4',
    ],
    'smtp' => [
        'host' => $env('SMTP_HOST', 'smtp.hostinger.com'),
        'port' => (int) $env('SMTP_PORT', '465'),
        'secure' => $env('SMTP_SECURE', 'ssl'),
        'user' => $env('SMTP_USER'),
        'pass' => $env('SMTP_PASS'),
        'from' => $env('SMTP_FROM', $env('SMTP_USER')),
        'from_name' => 'aayushmishra.engineer',
    ],
    'mail_to' => $env('MAIL_TO', 'contact@aayushmishra.engineer'),
    'buttondown' => [
        'api_key' => $env('BUTTONDOWN_API_KEY'),
        'webhook_secret' => $env('BUTTONDOWN_WEBHOOK_SECRET'),
    ],
    'cal' => [
        'webhook_secret' => $env('CAL_WEBHOOK_SECRET'),
    ],
    // F13: the Basic gate in front of /admin. Only the hash leaves this script.
    'admin' => [
        'basic_user' => $env('ADMIN_BASIC_USER'),
        'basic_pass_hash' => $env('ADMIN_BASIC_PASS') === '' ? '' : password_hash($env('ADMIN_BASIC_PASS'), PASSWORD_DEFAULT),
    ],
    // F24: a fine-grained token for this repository with "Contents: read and write" (repository_dispatch).
    'scanner' => [
        'github_token' => $env('SCANNER_GITHUB_TOKEN'),
        'repo' => $env('SCANNER_REPO', 'Aayush-Mishraa/MasterPortfolio-DevSculptedBy-AayushMishra'),
        'callback_secret' => $env('SCAN_CALLBACK_SECRET'),
        'daily_cap' => (int) $env('SCAN_DAILY_CAP', '30'),
    ],
    // F31: the site assistant; off while the key is empty.
    'anthropic' => [
        'api_key' => $env('ANTHROPIC_API_KEY'),
        'model' => $env('ASK_MODEL', 'claude-haiku-4-5'),
        'daily_cap' => (int) ($env('ASK_DAILY_CAP') ?: '200'),
    ],
    'neuralforge' => [
        'url' => $env('NEURALFORGE_URL') ?: 'https://neuralforge.aayushmishra.engineer',
    ],
    'client_ip_header' => $env('API_CLIENT_IP_HEADER'),
    'state_dir' => '',
];

$php = "<?php\n\n// Written by the deploy from GitHub secrets. Do not edit on the server.\n\nreturn " . var_export($config, true) . ";\n";
$dir = dirname($out);
if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) {
    fwrite(STDERR, "cannot create {$dir}\n");
    exit(1);
}
file_put_contents($out, $php);
chmod($out, 0600);

$present = static fn (string $value): string => $value === '' ? 'missing' : 'set';
echo "API config written to {$out} (env {$config['env']}, {$config['site_url']})\n";
foreach ([
    'API_APP_SECRET' => $config['app_secret'],
    'API_ADMIN_TOKEN' => $config['admin_token'],
    'DB_NAME' => $config['db']['name'],
    'DB_USER' => $config['db']['user'],
    'DB_PASS' => $config['db']['pass'],
    'SMTP_USER' => $config['smtp']['user'],
    'SMTP_PASS' => $config['smtp']['pass'],
    'MAIL_TO' => $config['mail_to'],
    'BUTTONDOWN_API_KEY' => $config['buttondown']['api_key'],
    'BUTTONDOWN_WEBHOOK_SECRET' => $config['buttondown']['webhook_secret'],
    'CAL_WEBHOOK_SECRET' => $config['cal']['webhook_secret'],
    'ADMIN_BASIC_USER' => $config['admin']['basic_user'],
    'ADMIN_BASIC_PASS' => $config['admin']['basic_pass_hash'],
    'SCANNER_GITHUB_TOKEN' => $config['scanner']['github_token'],
    'SCAN_CALLBACK_SECRET' => $config['scanner']['callback_secret'],
    'ANTHROPIC_API_KEY' => $config['anthropic']['api_key'],
] as $name => $value) {
    echo str_pad($name, 28) . $present($value) . "\n";
}
