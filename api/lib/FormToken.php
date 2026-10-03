<?php

declare(strict_types=1);

namespace Site;

/*
 * Signed form tokens (CSRF protection for the public forms, plus a time trap).
 *
 * The page fetches a token from /api/token.php before it submits. A token is
 * an HMAC-signed timestamp: it must be at least MIN_AGE seconds old (people
 * take longer than that to fill a form; most bots don't wait) and at most
 * MAX_AGE old. Nothing is stored server-side, so the CDN and many PHP workers
 * don't matter.
 */
final class FormToken
{
    public const MIN_AGE = 3;
    public const MAX_AGE = 7200;

    public function __construct(private Config $config)
    {
    }

    public function issue(string $form, ?int $now = null): string
    {
        $payload = self::encode(json_encode(['f' => $form, 't' => $now ?? time(), 'n' => bin2hex(random_bytes(8))]));
        return $payload . '.' . $this->sign($payload);
    }

    /**
     * @return array{valid: bool, reason: string, wait: int}
     *   reason: ok | missing | malformed | signature | form | too_new | expired
     */
    public function verify(string $token, string $form, ?int $now = null): array
    {
        $now ??= time();
        if ($token === '') {
            return ['valid' => false, 'reason' => 'missing', 'wait' => 0];
        }
        $parts = explode('.', $token);
        if (count($parts) !== 2 || $parts[0] === '' || $parts[1] === '') {
            return ['valid' => false, 'reason' => 'malformed', 'wait' => 0];
        }
        [$payload, $signature] = $parts;
        if (!hash_equals($this->sign($payload), $signature)) {
            return ['valid' => false, 'reason' => 'signature', 'wait' => 0];
        }
        $data = json_decode((string) self::decode($payload), true);
        if (!is_array($data) || !isset($data['t'], $data['f']) || !is_int($data['t'])) {
            return ['valid' => false, 'reason' => 'malformed', 'wait' => 0];
        }
        if ($data['f'] !== $form) {
            return ['valid' => false, 'reason' => 'form', 'wait' => 0];
        }
        $age = $now - $data['t'];
        if ($age < self::MIN_AGE) {
            return ['valid' => false, 'reason' => 'too_new', 'wait' => self::MIN_AGE - $age];
        }
        if ($age > self::MAX_AGE) {
            return ['valid' => false, 'reason' => 'expired', 'wait' => 0];
        }
        return ['valid' => true, 'reason' => 'ok', 'wait' => 0];
    }

    private function sign(string $payload): string
    {
        return self::encode(hash_hmac('sha256', 'form-token|' . $payload, $this->config->secret(), true));
    }

    private static function encode(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    private static function decode(string $text): string|false
    {
        return base64_decode(strtr($text, '-_', '+/'), true);
    }
}
