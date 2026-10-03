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
    'env' => 'production',
    'site_url' => 'https://aayushmishra.engineer',
    'allowed_origins' => ['https://aayushmishra.engineer', 'https://www.aayushmishra.engineer'],
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
echo "API config written to {$out}\n";
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
] as $name => $value) {
    echo str_pad($name, 28) . $present($value) . "\n";
}
