<?php

declare(strict_types=1);

namespace Site;

/*
 * Settings from config.php, which the deploy writes from GitHub secrets.
 *
 * Looked up, in order:
 *   1. SITE_API_CONFIG (an absolute path; tests and local Docker use it)
 *   2. <account>/domains/aayushmishra.engineer/private/api-config.php,
 *      i.e. next to public_html, outside the web root (what the deploy writes)
 *   3. api/config.php (local development; denied to the web by api/.htaccess)
 *
 * A missing file is not fatal: every endpoint can still answer, and the
 * health check reports what isn't configured.
 */
final class Config
{
    private static ?Config $instance = null;

    /** @param array<string, mixed> $values */
    private function __construct(private array $values, private string $source)
    {
    }

    public static function load(): self
    {
        if (self::$instance !== null) {
            return self::$instance;
        }
        $candidates = array_filter([
            getenv('SITE_API_CONFIG') ?: null,
            dirname(__DIR__, 3) . '/private/api-config.php',
            dirname(__DIR__) . '/config.php',
        ]);
        foreach ($candidates as $file) {
            if (@is_file($file) && @is_readable($file)) {
                $values = require $file;
                if (is_array($values)) {
                    return self::$instance = new self(self::withDefaults($values), self::label($file));
                }
            }
        }
        return self::$instance = new self(self::withDefaults([]), 'missing');
    }

    /** For tests: use these values instead of a file. */
    public static function fromArray(array $values, string $source = 'array'): self
    {
        return self::$instance = new self(self::withDefaults($values), $source);
    }

    public static function reset(): void
    {
        self::$instance = null;
    }

    /** @param array<string, mixed> $values */
    private static function withDefaults(array $values): array
    {
        $defaults = [
            'env' => 'production',
            'site_url' => 'https://aayushmishra.engineer',
            'allowed_origins' => ['https://aayushmishra.engineer', 'https://www.aayushmishra.engineer'],
            'app_secret' => '',
            'admin_token' => '',
            'db' => ['host' => 'localhost', 'port' => 3306, 'name' => '', 'user' => '', 'pass' => '', 'charset' => 'utf8mb4'],
            'smtp' => ['host' => 'smtp.hostinger.com', 'port' => 465, 'secure' => 'ssl', 'user' => '', 'pass' => '', 'from' => '', 'from_name' => 'aayushmishra.engineer'],
            'mail_to' => '',
            // api_base: only tests change it (a fake Buttondown)
            'buttondown' => ['api_key' => '', 'webhook_secret' => '', 'api_base' => ''],
            // The real client IP when a proxy/CDN sits in front: the name of the
            // $_SERVER key it fills (e.g. HTTP_X_FORWARDED_FOR), or '' for REMOTE_ADDR.
            'client_ip_header' => '',
            // Where the file-based rate limiter keeps its counters when the database is down.
            'state_dir' => '',
        ];
        foreach ($defaults as $key => $default) {
            if (!array_key_exists($key, $values)) {
                $values[$key] = $default;
            } elseif (is_array($default) && is_array($values[$key]) && !array_is_list($default)) {
                $values[$key] = array_replace($default, $values[$key]);
            }
        }
        return $values;
    }

    private static function label(string $file): string
    {
        if (str_ends_with($file, '/private/api-config.php')) {
            return 'private';
        }
        if (getenv('SITE_API_CONFIG') && $file === getenv('SITE_API_CONFIG')) {
            return 'env';
        }
        return 'local';
    }

    public function source(): string
    {
        return $this->source;
    }

    /** Dotted lookup: get('db.host'). */
    public function get(string $key, mixed $default = null): mixed
    {
        $value = $this->values;
        foreach (explode('.', $key) as $part) {
            if (!is_array($value) || !array_key_exists($part, $value)) {
                return $default;
            }
            $value = $value[$part];
        }
        return $value;
    }

    public function string(string $key): string
    {
        $value = $this->get($key, '');
        return is_scalar($value) ? trim((string) $value) : '';
    }

    public function hasDatabase(): bool
    {
        return $this->string('db.name') !== '' && $this->string('db.user') !== '';
    }

    public function hasMail(): bool
    {
        $sender = $this->string('smtp.from') !== '' || $this->string('smtp.user') !== '';
        $login = $this->string('smtp.user') === '' || $this->string('smtp.pass') !== '';
        return $this->string('smtp.host') !== '' && $this->string('mail_to') !== '' && $sender && $login;
    }

    public function hasSecret(): bool
    {
        return strlen($this->string('app_secret')) >= 32;
    }

    /** The HMAC key: the configured secret, or a per-server fallback so tokens still work. */
    public function secret(): string
    {
        $secret = $this->string('app_secret');
        if (strlen($secret) >= 32) {
            return $secret;
        }
        return hash('sha256', __DIR__ . php_uname('n') . 'site-api-fallback-secret');
    }

    public function stateDir(): string
    {
        $dir = $this->string('state_dir');
        if ($dir === '') {
            $dir = dirname(__DIR__, 3) . '/private/api-state';
        }
        return rtrim($dir, '/');
    }
}
