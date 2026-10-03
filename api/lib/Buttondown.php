<?php

declare(strict_types=1);

namespace Site;

/*
 * The newsletter lives in Buttondown. We create subscribers through its API
 * (it sends its own confirmation email: double opt-in) and keep a copy of each
 * subscriber's status in MySQL, updated by its signed webhooks.
 */
final class Buttondown
{
    public function __construct(private Config $config)
    {
    }

    public function configured(): bool
    {
        return $this->config->string('buttondown.api_key') !== '';
    }

    private function base(): string
    {
        return rtrim($this->config->string('buttondown.api_base') ?: 'https://api.buttondown.com/v1', '/');
    }

    /** @return array<string, string> */
    private function headers(): array
    {
        return [
            'Authorization' => 'Token ' . $this->config->string('buttondown.api_key'),
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ];
    }

    /**
     * @return array{outcome: string, id: ?string}
     *   outcome: created | exists | rejected | unavailable
     */
    public function subscribe(string $email, string $source, string $ip, string $referrer): array
    {
        $body = [
            'email_address' => $email,
            'tags' => [$source],
            'referrer_url' => $referrer,
        ];
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            $body['ip_address'] = $ip; // helps Buttondown's spam checks
        }
        $response = HttpClient::request('POST', $this->base() . '/subscribers', $this->headers(), json_encode($body));

        if ($response['status'] === 201 || $response['status'] === 200) {
            $id = is_array($response['json']) ? (string) ($response['json']['id'] ?? '') : '';
            return ['outcome' => 'created', 'id' => $id !== '' ? $id : null];
        }
        if ($response['status'] === 400) {
            $text = strtolower($response['body']);
            if (str_contains($text, 'already') || str_contains($text, 'exists') || str_contains($text, 'duplicate') || str_contains($text, 'suppressed')) {
                return ['outcome' => 'exists', 'id' => null];
            }
            error_log('[api] buttondown rejected a subscriber: ' . mb_substr($response['body'], 0, 300));
            return ['outcome' => 'rejected', 'id' => null];
        }
        error_log('[api] buttondown unavailable: HTTP ' . $response['status']);
        return ['outcome' => 'unavailable', 'id' => null];
    }

    /** The subscriber's email and state, looked up by Buttondown id. */
    public function subscriber(string $id): ?array
    {
        if (!$this->configured() || !preg_match('/^[A-Za-z0-9-]{8,64}$/', $id)) {
            return null;
        }
        $response = HttpClient::request('GET', $this->base() . '/subscribers/' . rawurlencode($id), $this->headers());
        return $response['status'] === 200 && is_array($response['json']) ? $response['json'] : null;
    }

    /** X-Buttondown-Signature: sha256=<hex HMAC-SHA256 of the raw body, keyed with the webhook signing key>. */
    public function validSignature(string $rawBody, string $header): bool
    {
        $secret = $this->config->string('buttondown.webhook_secret');
        if ($secret === '' || !preg_match('/^sha256=([a-f0-9]{64})$/i', trim($header), $match)) {
            return false;
        }
        return hash_equals(hash_hmac('sha256', $rawBody, $secret), strtolower($match[1]));
    }
}
