<?php

declare(strict_types=1);

namespace Site\Tests\Integration;

/** POST /api/enquiry.php end to end (F12): saved as a service lead, mailed, and every guard. */
final class EnquiryEndpointTest extends ApiTestCase
{
    /** @return array<string, mixed> */
    private function form(array $overrides = []): array
    {
        $unique = bin2hex(random_bytes(4));
        return $overrides + [
            'token' => $this->token('enquiry'),
            'website' => '',
            'service' => 'qa-health-check',
            'name' => 'Grace Hopper',
            'email' => "grace-{$unique}@example.com",
            'company' => 'Compiler Co',
            'budget' => '1000-3000',
            'timeline' => '1–3 months',
            'message' => "Our regression takes two days and CI is red half the time. Ref {$unique}.",
            'page' => '/services/qa-health-check',
        ];
    }

    public function testAValidEnquiryIsSavedAsAServiceLeadAndMailed(): void
    {
        $this->request('POST', '/api/migrate.php', ['Authorization' => 'Bearer ' . self::ADMIN]);
        $form = $this->form();
        $response = $this->postJson('/api/enquiry.php', $form);

        $this->assertSame(200, $response['status'], $response['body']);
        $this->assertTrue($response['json']['ok']);
        $this->assertTrue($response['json']['delivered']);
        $this->assertStringContainsString('no-store', $response['headers']['cache-control'] ?? '');

        $row = $this->db()->prepare('SELECT * FROM leads WHERE email = :email');
        $row->execute(['email' => $form['email']]);
        $lead = $row->fetch();
        $this->assertNotFalse($lead, 'the lead is in the database');
        $this->assertSame('service:qa-health-check', $lead['source']);
        $this->assertSame('service', $lead['intent']);
        $this->assertSame('1000-3000', $lead['budget']);
        $this->assertSame('1–3 months', $lead['timeline']);
        $this->assertSame('new', $lead['status']);
        $this->assertSame('1', (string) $lead['mail_sent']);
        $this->assertStringNotContainsString($this->visitorIp, json_encode($lead), 'the IP is only stored hashed');

        $messages = $this->mailTo($form['email']);
        $this->assertCount(1, $messages);
        $mail = $this->mailMessage($messages[0]['ID']);
        $this->assertSame('[Enquiry: QA Health Check] Grace Hopper · Compiler Co', $mail['Subject']);
        $this->assertSame($form['email'], $mail['ReplyTo'][0]['Address']);
        $this->assertStringContainsString('Budget:   $1,000–$3,000', $mail['Text']);
        $this->assertStringContainsString('Service:  QA Health Check', $mail['Text']);
    }

    public function testBudgetAndTimelineAreOptional(): void
    {
        $form = $this->form(['budget' => null, 'timeline' => null, 'company' => '', 'service' => 'mentoring']);
        $response = $this->postJson('/api/enquiry.php', $form);
        $this->assertSame(200, $response['status'], $response['body']);

        $row = $this->db()->prepare('SELECT source, budget, timeline, company FROM leads WHERE email = :email');
        $row->execute(['email' => $form['email']]);
        $lead = $row->fetch();
        $this->assertSame('service:mentoring', $lead['source']);
        $this->assertNull($lead['budget']);
        $this->assertNull($lead['timeline']);
        $this->assertNull($lead['company']);
    }

    public function testValidation(): void
    {
        $response = $this->postJson('/api/enquiry.php', $this->form([
            'service' => 'free-lunch',
            'budget' => 'a million',
            'email' => 'not-an-email',
            'message' => 'too short',
        ]));
        $this->assertSame(422, $response['status']);
        $fields = $response['json']['fields'];
        foreach (['service', 'budget', 'email', 'message'] as $field) {
            $this->assertArrayHasKey($field, $fields, $field);
        }

        $missing = $this->form();
        unset($missing['service']);
        $response = $this->postJson('/api/enquiry.php', $missing);
        $this->assertSame(422, $response['status']);
        $this->assertArrayHasKey('service', $response['json']['fields']);
    }

    public function testGuards(): void
    {
        // A contact-form token can't be replayed here.
        $wrongForm = $this->postJson('/api/enquiry.php', $this->form(['token' => $this->token('contact')]));
        $this->assertSame(403, $wrongForm['status']);

        $tooFast = $this->postJson('/api/enquiry.php', $this->form(['token' => $this->token('enquiry', 0)]));
        $this->assertSame(429, $tooFast['status']);
        $this->assertSame('too_fast', $tooFast['json']['error']);

        $honeypot = $this->form(['website' => 'https://spam.example']);
        $this->assertSame(200, $this->postJson('/api/enquiry.php', $honeypot)['status']);
        $row = $this->db()->prepare('SELECT COUNT(*) FROM leads WHERE email = :email');
        $row->execute(['email' => $honeypot['email']]);
        $this->assertSame(0, (int) $row->fetchColumn());

        $foreign = $this->postJson('/api/enquiry.php', $this->form(), ['Origin' => 'https://evil.example']);
        $this->assertSame(403, $foreign['status']);
        $this->assertSame(405, $this->request('GET', '/api/enquiry.php')['status']);
    }

    public function testRateLimit(): void
    {
        for ($i = 0; $i < 3; $i++) {
            $this->assertSame(200, $this->postJson('/api/enquiry.php', $this->form())['status']);
        }
        $limited = $this->postJson('/api/enquiry.php', $this->form());
        $this->assertSame(429, $limited['status']);
        $this->assertSame('rate_limited', $limited['json']['error']);
    }
}
