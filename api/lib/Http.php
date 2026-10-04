<?php

declare(strict_types=1);

namespace Site;

/*
 * Request and response helpers. Every response is JSON, never cached and never
 * indexed. Browsers may only call us from our own origin (strict CORS: no
 * Access-Control-Allow-Origin header is ever sent).
 */
final class Http
{
    /** Set by tests so error() can be caught instead of exiting. */
    public static bool $testing = false;

    public static function sendCommonHeaders(): void
    {
        if (headers_sent()) {
            return;
        }
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store, private, max-age=0');
        header('Pragma: no-cache');
        header('X-Robots-Tag: noindex, nofollow');
        header('X-Content-Type-Options: nosniff');
        header('Referrer-Policy: same-origin');
        header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
    }

    /** @param array<string, mixed> $data */
    public static function json(int $status, array $data): never
    {
        if (!headers_sent()) {
            http_response_code($status);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        if (self::$testing) {
            throw new HttpExit($status, $data);
        }
        exit;
    }

    /** @param array<string, mixed> $extra */
    public static function error(int $status, string $code, string $message, array $extra = []): never
    {
        self::json($status, ['ok' => false, 'error' => $code, 'message' => $message] + $extra);
    }

    public static function method(): string
    {
        return strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
    }

    public static function requireMethod(string ...$methods): void
    {
        if (self::method() === 'OPTIONS') {
            // A cross-origin preflight: answer without any CORS grant, so it fails.
            if (!headers_sent()) {
                http_response_code(204);
                header('Allow: ' . implode(', ', $methods));
            }
            if (self::$testing) {
                throw new HttpExit(204, []);
            }
            exit;
        }
        if (!in_array(self::method(), $methods, true)) {
            if (!headers_sent()) {
                header('Allow: ' . implode(', ', $methods));
            }
            self::error(405, 'method_not_allowed', 'This endpoint only accepts ' . implode(' or ', $methods) . '.');
        }
    }

    public static function header(string $name): string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        $value = $_SERVER[$key] ?? ($name === 'Content-Type' ? ($_SERVER['CONTENT_TYPE'] ?? '') : '');
        return trim((string) $value);
    }

    /**
     * A browser request must come from one of our origins. Browsers always send
     * Origin on a POST fetch; a request without one (curl, a script) is let
     * through here and stopped by the form token, honeypot and rate limit.
     */
    public static function requireAllowedOrigin(Config $config): void
    {
        $origin = self::header('Origin');
        if ($origin === '' || $origin === 'null') {
            if ($origin === 'null') {
                self::error(403, 'origin_not_allowed', 'Requests from this page are not accepted.');
            }
            return;
        }
        $allowed = array_map(static fn ($value) => rtrim((string) $value, '/'), (array) $config->get('allowed_origins', []));
        if (!in_array(rtrim($origin, '/'), $allowed, true)) {
            self::error(403, 'origin_not_allowed', 'Requests from this page are not accepted.');
        }
    }

    /**
     * The JSON body as an array: 415 unless it is application/json, 413 above
     * $maxBytes, 400 when it isn't a JSON object.
     *
     * @return array<string, mixed>
     */
    public static function readJson(int $maxBytes = 16384, ?string $raw = null): array
    {
        $type = strtolower(self::header('Content-Type'));
        if (!str_starts_with($type, 'application/json')) {
            self::error(415, 'unsupported_media_type', 'Send the form as JSON.');
        }
        $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($length > $maxBytes) {
            self::error(413, 'payload_too_large', 'That message is too long.');
        }
        $raw ??= (string) file_get_contents('php://input', false, null, 0, $maxBytes + 1);
        if (strlen($raw) > $maxBytes) {
            self::error(413, 'payload_too_large', 'That message is too long.');
        }
        try {
            $data = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
        } catch (\JsonException $error) {
            self::error(400, 'invalid_json', 'The request could not be read.');
        }
        if (!is_array($data) || array_is_list($data)) {
            self::error(400, 'invalid_json', 'The request could not be read.');
        }
        return $data;
    }

    /**
     * The visitor's IP. Behind a CDN, REMOTE_ADDR is the CDN edge, so the
     * header named in client_ip_header is used instead (its last address is
     * the one the CDN itself saw; anything before it is client-supplied).
     */
    public static function clientIp(Config $config): string
    {
        $remote = (string) ($_SERVER['REMOTE_ADDR'] ?? '');
        $header = $config->string('client_ip_header');
        if ($header !== '' && !empty($_SERVER[$header])) {
            $parts = array_values(array_filter(array_map('trim', explode(',', (string) $_SERVER[$header]))));
            $candidate = $parts ? $parts[count($parts) - 1] : '';
            if (filter_var($candidate, FILTER_VALIDATE_IP)) {
                return $candidate;
            }
        }
        return filter_var($remote, FILTER_VALIDATE_IP) ? $remote : '0.0.0.0';
    }

    /** A keyed hash of the IP: enough to rate-limit and spot abuse, not to identify anyone. */
    public static function ipHash(Config $config, string $ip): string
    {
        return hash_hmac('sha256', 'ip|' . $ip, $config->secret());
    }

    /**
     * The bearer token. Apache hides Authorization from PHP unless .htaccess
     * copies it into the environment, so every place it can turn up is tried,
     * then the X-Admin-Token header.
     */
    public static function bearerToken(): string
    {
        $header = self::header('Authorization');
        if ($header === '' && isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
            $header = trim((string) $_SERVER['REDIRECT_HTTP_AUTHORIZATION']);
        }
        if ($header === '' && function_exists('getallheaders')) {
            foreach ((array) getallheaders() as $name => $value) {
                if (strtolower((string) $name) === 'authorization') {
                    $header = trim((string) $value);
                }
            }
        }
        // X-Admin-Token also works when Authorization is taken by a Basic login
        // (the password-protected staging site).
        if (!preg_match('/^Bearer\s/i', $header) && self::header('X-Admin-Token') !== '') {
            $header = 'Bearer ' . self::header('X-Admin-Token');
        }
        return preg_match('/^Bearer\s+(\S+)$/i', $header, $match) ? $match[1] : '';
    }

    /** True only for a request carrying the configured admin token. */
    public static function isAdmin(Config $config): bool
    {
        $expected = $config->string('admin_token');
        $given = self::bearerToken();
        return strlen($expected) >= 24 && $given !== '' && hash_equals($expected, $given);
    }

    public static function requireAdmin(Config $config): void
    {
        if (!self::isAdmin($config)) {
            self::error(401, 'unauthorized', 'A valid admin token is required.');
        }
    }
}
