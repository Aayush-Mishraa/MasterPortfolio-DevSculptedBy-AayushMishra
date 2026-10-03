<?php

declare(strict_types=1);

namespace Site\Tests\Integration;

/** POST /api/contact.php end to end: saved, mailed, and every guard. */
final class ContactEndpointTest extends ApiTestCase
{
    /** @return array<string, mixed> */
    private function form(array $overrides = []): array
    {
        $unique = bin2hex(random_bytes(4));
        return $overrides + [
            'token' => $this->token('contact'),
            'website' => '',
            'intent' => 'audit',
            'topics' => ['cicd', 'frameworks'],
            'name' => 'Ada Lovelace',
            'email' => "ada-{$unique}@example.com",
            'company' => 'Analytical Engines',
            'timeline' => '< 1 month',
            'message' => "Our Playwright suite is flaky in CI. Ref {$unique}.",
            'page' => '/contact',
            'source' => 'contact',
        ];
    }

    public function testAValidMessageIsSavedAndMailed(): void
    {
        $this->request('POST', '/api/migrate.php', ['Authorization' => 'Bearer ' . self::ADMIN]);
        $form = $this->form();
        $response = $this->postJson('/api/contact.php', $form);

        $this->assertSame(200, $response['status'], $response['body']);
        $this->assertTrue($response['json']['ok']);
        $this->assertTrue($response['json']['delivered']);
        $this->assertArrayNotHasKey('id', $response['json'], 'no lead number in the reply');
        $this->assertStringContainsString('no-store', $response['headers']['cache-control'] ?? '');

        $row = $this->db()->prepare('SELECT * FROM leads WHERE email = :email');
        $row->execute(['email' => $form['email']]);
        $lead = $row->fetch();
        $this->assertNotFalse($lead, 'the lead is in the database');
        $this->assertSame('audit', $lead['intent']);
        $this->assertSame('cicd,frameworks', $lead['topics']);
        $this->assertSame('1', (string) $lead['mail_sent']);
        $this->assertSame(64, strlen((string) $lead['ip_hash']));
        $this->assertStringNotContainsString($this->visitorIp, json_encode($lead), 'the IP is only stored hashed');

        $messages = $this->mailTo($form['email']);
        $this->assertCount(1, $messages);
        $mail = $this->mailMessage($messages[0]['ID']);
        $this->assertSame('[Automation audit] Ada Lovelace · Analytical Engines', $mail['Subject']);
        $this->assertSame($form['email'], $mail['ReplyTo'][0]['Address']);
        $this->assertSame('contact@aayushmishra.engineer', $mail['To'][0]['Address']);
        $this->assertStringContainsString($form['message'], $mail['Text']);
        $this->assertStringContainsString('Topics:   CI/CD pipelines, Test automation frameworks', $mail['Text']);
    }

    public function testHoneypotGetsAQuietOkAndNothingElse(): void
    {
        $form = $this->form(['website' => 'https://spam.example']);
        $response = $this->postJson('/api/contact.php', $form);
        $this->assertSame(200, $response['status']);
        $this->assertTrue($response['json']['ok']);

        $row = $this->db()->prepare('SELECT COUNT(*) FROM leads WHERE email = :email');
        $row->execute(['email' => $form['email']]);
        $this->assertSame(0, (int) $row->fetchColumn());
        $this->assertSame([], $this->mailTo($form['email']));
    }

    public function testTokenRules(): void
    {
        $missing = $this->postJson('/api/contact.php', $this->form(['token' => '']));
        $this->assertSame(403, $missing['status']);
        $this->assertSame('invalid_token', $missing['json']['error']);

        $tooFast = $this->postJson('/api/contact.php', $this->form(['token' => $this->token('contact', 0)]));
        $this->assertSame(429, $tooFast['status']);
        $this->assertSame('too_fast', $tooFast['json']['error']);
        $this->assertGreaterThan(0, $tooFast['json']['retry_after']);

        $otherForm = $this->postJson('/api/contact.php', $this->form(['token' => $this->token('subscribe')]));
        $this->assertSame(403, $otherForm['status']);
    }

    public function testServerSideValidation(): void
    {
        $response = $this->postJson('/api/contact.php', $this->form([
            'name' => '',
            'email' => 'not-an-email',
            'message' => 'too short',
            'intent' => 'hack',
            'topics' => ['cicd', 'nope'],
            'timeline' => 'yesterday',
        ]));
        $this->assertSame(422, $response['status']);
        $this->assertSame(['intent', 'topics', 'name', 'email', 'timeline', 'message'], array_keys($response['json']['fields']));
    }

    public function testRateLimitPerVisitor(): void
    {
        for ($i = 1; $i <= 3; $i++) {
            $this->assertSame(200, $this->postJson('/api/contact.php', $this->form())['status'], "message {$i}");
        }
        $fourth = $this->postJson('/api/contact.php', $this->form());
        $this->assertSame(429, $fourth['status']);
        $this->assertSame('rate_limited', $fourth['json']['error']);
        $this->assertGreaterThan(0, $fourth['json']['retry_after']);

        // Someone else is not affected.
        $this->visitorIp = '203.0.113.' . random_int(1, 254);
        $this->assertSame(200, $this->postJson('/api/contact.php', $this->form())['status']);
    }

    public function testRequestShapeGuards(): void
    {
        $this->assertSame(405, $this->request('GET', '/api/contact.php')['status']);
        $this->assertSame(403, $this->postJson('/api/contact.php', $this->form(), ['Origin' => 'https://evil.example'])['status']);
        $this->assertSame(415, $this->request('POST', '/api/contact.php', ['Content-Type' => 'text/plain', 'Origin' => $this->origin()], 'hi')['status']);
        $big = $this->form(['message' => str_repeat('x', 20000)]);
        $this->assertSame(413, $this->postJson('/api/contact.php', $big)['status']);
        $preflight = $this->request('OPTIONS', '/api/contact.php', ['Origin' => 'https://evil.example', 'Access-Control-Request-Method' => 'POST']);
        $this->assertArrayNotHasKey('access-control-allow-origin', $preflight['headers']);
    }
}
