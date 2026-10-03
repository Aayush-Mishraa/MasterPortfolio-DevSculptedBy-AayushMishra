<?php

declare(strict_types=1);

/*
 * Test settings come from the environment:
 *   TEST_DB_HOST/PORT/NAME/USER/PASS   a throwaway MySQL database (DB tests skip without it)
 *   TEST_SMTP_HOST/PORT, MAILPIT_URL   a Mailpit instance (mail tests skip without it)
 *   API_BASE_URL                       a server running these endpoints (HTTP tests skip without it)
 */

require __DIR__ . '/../vendor/autoload.php';

Site\Http::$testing = true;

function test_env(string $name, string $default = ''): string
{
    $value = getenv($name);
    return $value === false ? $default : $value;
}

/** @return array<string, mixed> */
function test_config(array $overrides = []): array
{
    return array_replace_recursive([
        'env' => 'test',
        'allowed_origins' => ['https://aayushmishra.engineer'],
        // The server under test must share it, so tests can mint form tokens.
        'app_secret' => test_env('TEST_APP_SECRET', str_repeat('t', 40)),
        'admin_token' => 'test-admin-token-0123456789abcdef',
        'db' => [
            'host' => test_env('TEST_DB_HOST', '127.0.0.1'),
            'port' => (int) test_env('TEST_DB_PORT', '3306'),
            'name' => test_env('TEST_DB_NAME'),
            'user' => test_env('TEST_DB_USER'),
            'pass' => test_env('TEST_DB_PASS'),
        ],
        'smtp' => [
            'host' => test_env('TEST_SMTP_HOST'),
            'port' => (int) test_env('TEST_SMTP_PORT', '1025'),
            'secure' => '',
            'user' => '',
            'pass' => '',
            'from' => 'contact@aayushmishra.engineer',
        ],
        'mail_to' => 'contact@aayushmishra.engineer',
        'state_dir' => sys_get_temp_dir() . '/site-api-test-' . getmypid(),
    ], $overrides);
}
