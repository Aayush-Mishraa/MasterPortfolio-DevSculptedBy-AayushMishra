<?php

declare(strict_types=1);

namespace Site\Tests\Integration;

/**
 * Newsletter sign-up through a fake Buttondown (FAKE_BUTTONDOWN_URL), and the
 * signed webhook that mirrors each subscriber's status into MySQL.
 */
final class NewsletterTest extends ApiTestCase
{
    private const SECRET_ENV = 'TEST_BUTTONDOWN_WEBHOOK_SECRET';

    private string $fake;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fake = rtrim(test_env('FAKE_BUTTONDOWN_URL'), '/');
        if ($this->fake === '') {
            $this->markTestSkipped('FAKE_BUTTONDOWN_URL is not set');
        }
        $this->request('POST', '/api/migrate.php', ['Authorization' => 'Bearer ' . self::ADMIN]);
    }

    private function subscribe(string $email, array $overrides = []): array
    {
        return $this->postJson('/api/subscribe.php', $overrides + [
            'token' => $this->token('subscribe'),
            'website' => '',
            'email' => $email,
            'source' => 'footer',
            'page' => '/blog',
        ]);
    }

    /** @return list<array<string, mixed>> */
    private function fakeRequests(): array
    {
        return json_decode((string) file_get_contents($this->fake . '/__requests'), true) ?: [];
    }

    private function webhook(array $event, ?string $signature = null): array
    {
        $raw = json_encode($event);
        $secret = test_env(self::SECRET_ENV, 'local-buttondown-webhook-secret');
        return $this->request('POST', '/api/buttondown-webhook.php', [
            'Content-Type' => 'application/json',
            'X-Buttondown-Signature' => $signature ?? 'sha256=' . hash_hmac('sha256', $raw, $secret),
        ], $raw);
    }

    private function subscriberRow(string $email): array|false
    {
        $statement = $this->db()->prepare('SELECT * FROM subscribers WHERE email = :email');
        $statement->execute(['email' => $email]);
        return $statement->fetch();
    }

    public function testSignUpGoesToButtondownAndIsPendingUntilConfirmed(): void
    {
        $email = 'reader-' . bin2hex(random_bytes(4)) . '@example.com';
        $response = $this->subscribe($email);
        $this->assertSame(200, $response['status'], $response['body']);
        $this->assertSame('pending', $response['json']['status']);

        $sent = array_values(array_filter($this->fakeRequests(), static fn ($r) => ($r['body']['email_address'] ?? '') === $email));
        $this->assertCount(1, $sent, 'Buttondown got exactly one request');
        $this->assertSame('Token test-buttondown-key', $sent[0]['auth']);
        $this->assertSame(['footer'], $sent[0]['body']['tags']);
        $this->assertStringEndsWith('/blog', $sent[0]['body']['referrer_url']);
        $this->assertArrayNotHasKey('type', $sent[0]['body'], 'no "regular" type: Buttondown sends the confirmation (double opt-in)');

        $row = $this->subscriberRow($email);
        $this->assertSame('pending', $row['status']);
        $buttondownId = $row['buttondown_id'];
        $this->assertNotEmpty($buttondownId);

        // Buttondown confirms → the local copy follows; a replay is ignored.
        $event = ['id' => 'evt-' . bin2hex(random_bytes(6)), 'event_type' => 'subscriber.confirmed', 'data' => ['subscriber' => $buttondownId]];
        $this->assertSame(200, $this->webhook($event)['status']);
        $this->assertSame('confirmed', $this->subscriberRow($email)['status']);
        $this->assertNotNull($this->subscriberRow($email)['confirmed_at']);
        $this->assertTrue($this->webhook($event)['json']['duplicate']);

        // A late "created" event doesn't undo the confirmation.
        $late = ['id' => 'evt-' . bin2hex(random_bytes(6)), 'event_type' => 'subscriber.created', 'data' => ['subscriber' => $buttondownId]];
        $this->webhook($late);
        $this->assertSame('confirmed', $this->subscriberRow($email)['status']);

        $gone = ['id' => 'evt-' . bin2hex(random_bytes(6)), 'event_type' => 'subscriber.unsubscribed', 'data' => ['subscriber' => $buttondownId]];
        $this->webhook($gone);
        $this->assertSame('unsubscribed', $this->subscriberRow($email)['status']);
        $this->assertNotNull($this->subscriberRow($email)['unsubscribed_at']);
    }

    public function testExistingAddressGetsTheSameAnswer(): void
    {
        $email = 'exists-' . bin2hex(random_bytes(4)) . '@example.com';
        $response = $this->subscribe($email);
        $this->assertSame(200, $response['status']);
        $this->assertSame('pending', $response['json']['status'], 'no hint that the address is already on the list');
    }

    public function testRejectedAndUnavailable(): void
    {
        $rejected = $this->subscribe('reject-' . bin2hex(random_bytes(3)) . '@example.com');
        $this->assertSame(422, $rejected['status']);
        $this->assertArrayHasKey('email', $rejected['json']['fields']);

        $down = $this->subscribe('down-' . bin2hex(random_bytes(3)) . '@example.com');
        $this->assertSame(502, $down['status']);
    }

    public function testGuards(): void
    {
        $bot = 'bot-' . bin2hex(random_bytes(3)) . '@example.com';
        $honeypot = $this->subscribe($bot, ['website' => 'x']);
        $this->assertSame(200, $honeypot['status']);
        $this->assertFalse($this->subscriberRow($bot));
        $this->assertSame([], array_filter($this->fakeRequests(), static fn ($r) => ($r['body']['email_address'] ?? '') === $bot));

        $this->assertSame(403, $this->subscribe('a@example.com', ['token' => $this->token('contact')])['status']);
        $this->assertSame(429, $this->subscribe('a@example.com', ['token' => $this->token('subscribe', 0)])['status']);
        $this->assertSame(422, $this->subscribe('not-an-email')['status']);

        for ($i = 0; $i < 5; $i++) {
            $this->subscribe('limit-' . $i . '-' . bin2hex(random_bytes(3)) . '@example.com');
        }
        $this->assertSame(429, $this->subscribe('limit-x@example.com')['status']);
    }

    public function testWebhookNeedsAValidSignature(): void
    {
        $event = ['id' => 'evt-x', 'event_type' => 'subscriber.confirmed', 'data' => ['subscriber' => 'sub-x']];
        $this->assertSame(401, $this->webhook($event, 'sha256=' . str_repeat('0', 64))['status']);
        $this->assertSame(401, $this->webhook($event, 'nonsense')['status']);
        $this->assertSame(405, $this->request('GET', '/api/buttondown-webhook.php')['status']);
    }

    public function testWebhookForASubscriberMadeElsewhere(): void
    {
        $id = 'ext-' . bin2hex(random_bytes(5));
        $event = ['id' => 'evt-' . bin2hex(random_bytes(6)), 'event_type' => 'subscriber.confirmed', 'data' => ['subscriber' => $id]];
        $this->assertSame(200, $this->webhook($event)['status']);
        $row = $this->subscriberRow($id . '@example.com');
        $this->assertSame('confirmed', $row['status']);
        $this->assertSame('buttondown', $row['source']);

        $other = ['id' => 'evt-' . bin2hex(random_bytes(6)), 'event_type' => 'email.sent', 'data' => ['email' => 'x']];
        $this->assertSame('email.sent', $this->webhook($other)['json']['ignored']);
    }
}
