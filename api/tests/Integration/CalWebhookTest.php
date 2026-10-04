<?php

declare(strict_types=1);

namespace Site\Tests\Integration;

/** POST /api/cal-webhook.php (F12): signed Cal.com booking events → the bookings table. */
final class CalWebhookTest extends ApiTestCase
{
    private const SECRET = 'local-cal-webhook-secret';

    /** @return array<string, mixed> a Cal.com webhook body, as documented */
    private function event(string $trigger, string $uid, array $payload = []): array
    {
        return [
            'triggerEvent' => $trigger,
            'createdAt' => gmdate('Y-m-d\TH:i:s.v\Z'),
            'payload' => $payload + [
                'uid' => $uid,
                'bookingId' => random_int(1000, 999999),
                'type' => 'release-review',
                'title' => 'Release Review call between Aayush Mishra and Ada',
                'startTime' => '2026-11-02T10:00:00Z',
                'endTime' => '2026-11-02T11:00:00Z',
                'attendees' => [['name' => 'Ada Lovelace', 'email' => 'Ada@Example.com', 'timeZone' => 'Europe/London']],
                'status' => 'ACCEPTED',
                'price' => 19900,
                'currency' => 'usd',
                'paid' => false,
            ],
        ];
    }

    private function send(array $event, ?string $signature = null): array
    {
        $raw = json_encode($event);
        return $this->request('POST', '/api/cal-webhook.php', [
            'Content-Type' => 'application/json',
            'X-Cal-Signature-256' => $signature ?? hash_hmac('sha256', $raw, self::SECRET),
        ], $raw);
    }

    private function booking(string $uid): array|false
    {
        $statement = $this->db()->prepare('SELECT * FROM bookings WHERE booking_uid = :uid');
        $statement->execute(['uid' => $uid]);
        return $statement->fetch();
    }

    public function testAPaidBookingIsStoredOnce(): void
    {
        $this->request('POST', '/api/migrate.php', ['Authorization' => 'Bearer ' . self::ADMIN]);
        $uid = 'bk_' . bin2hex(random_bytes(6));

        $initiated = $this->event('BOOKING_PAYMENT_INITIATED', $uid);
        $this->assertSame(200, $this->send($initiated)['status']);
        $this->assertSame('awaiting_payment', $this->booking($uid)['status']);

        $created = $this->event('BOOKING_CREATED', $uid);
        $this->assertSame(200, $this->send($created)['status']);
        $paid = $this->event('BOOKING_PAID', $uid, ['paid' => true]);
        $this->assertSame(200, $this->send($paid)['status']);

        $row = $this->booking($uid);
        $this->assertSame('booked', $row['status']);
        $this->assertSame('1', (string) $row['paid']);
        $this->assertSame('release-review', $row['event_type']);
        $this->assertSame('ada@example.com', $row['attendee_email']);
        $this->assertSame('Europe/London', $row['attendee_tz']);
        $this->assertSame('2026-11-02 10:00:00', $row['start_at']);
        $this->assertSame(19900, (int) $row['price']);
        $this->assertSame('USD', $row['currency']);

        // A retried delivery is acknowledged and changes nothing.
        $again = $this->send($paid);
        $this->assertSame(200, $again['status']);
        $this->assertTrue($again['json']['duplicate']);
        $count = $this->db()->prepare('SELECT COUNT(*) FROM bookings WHERE booking_uid = :uid');
        $count->execute(['uid' => $uid]);
        $this->assertSame(1, (int) $count->fetchColumn());
    }

    public function testCancelAndReschedule(): void
    {
        $old = 'bk_' . bin2hex(random_bytes(6));
        $new = 'bk_' . bin2hex(random_bytes(6));
        $this->send($this->event('BOOKING_CREATED', $old));
        $this->send($this->event('BOOKING_RESCHEDULED', $new, ['rescheduleUid' => $old, 'startTime' => '2026-11-05T09:00:00Z']));
        $this->assertSame('rescheduled', $this->booking($old)['status']);
        $this->assertSame('booked', $this->booking($new)['status']);
        $this->assertSame('2026-11-05 09:00:00', $this->booking($new)['start_at']);

        $this->send($this->event('BOOKING_CANCELLED', $new));
        $this->assertSame('cancelled', $this->booking($new)['status']);
        // A late payment notice doesn't revive a cancelled booking.
        $this->send($this->event('BOOKING_PAID', $new, ['paid' => true]));
        $this->assertSame('cancelled', $this->booking($new)['status']);
    }

    public function testSignatureAndShape(): void
    {
        $event = $this->event('BOOKING_CREATED', 'bk_' . bin2hex(random_bytes(6)));
        $this->assertSame(401, $this->send($event, str_repeat('0', 64))['status']);
        $this->assertSame(401, $this->send($event, 'nonsense')['status']);
        $this->assertSame(401, $this->send($event, '')['status']);
        $this->assertFalse($this->booking($event['payload']['uid']));
        $this->assertSame(405, $this->request('GET', '/api/cal-webhook.php')['status']);

        $other = $this->send(['triggerEvent' => 'MEETING_ENDED', 'payload' => ['uid' => 'x']]);
        $this->assertSame(200, $other['status']);
        $this->assertSame('MEETING_ENDED', $other['json']['ignored']);
    }
}
