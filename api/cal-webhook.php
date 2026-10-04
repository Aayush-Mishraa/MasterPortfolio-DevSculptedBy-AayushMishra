<?php

declare(strict_types=1);

/*
 * POST /api/cal-webhook.php: Cal.com booking webhooks → the bookings table (F12).
 *
 * Server to server, so no origin check: the request must carry a valid
 * x-cal-signature-256 (HMAC-SHA256 of the raw body with the webhook's secret,
 * hex). Each delivery is processed once (webhook_events). Booking events
 * upsert one row per booking uid; anything else is acknowledged and ignored.
 */

use Site\Db;
use Site\Http;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('POST');

$raw = (string) file_get_contents('php://input', false, null, 0, 262145);
if (strlen($raw) > 262144) {
    Http::error(413, 'payload_too_large', 'Too large.');
}

$secret = $config->string('cal.webhook_secret');
if ($secret === '') {
    Http::error(503, 'not_configured', 'Webhook secret not configured.');
}
$signature = strtolower(trim(Http::header('X-Cal-Signature-256')));
$signature = (string) preg_replace('/^sha256=/', '', $signature);
if (!preg_match('/^[a-f0-9]{64}$/', $signature) || !hash_equals(hash_hmac('sha256', $raw, $secret), $signature)) {
    Http::error(401, 'bad_signature', 'Invalid signature.');
}

$event = json_decode($raw, true);
if (!is_array($event) || !is_string($event['triggerEvent'] ?? null)) {
    Http::error(400, 'invalid_json', 'Unreadable event.');
}
$type = $event['triggerEvent'];
$booking = is_array($event['payload'] ?? null) ? $event['payload'] : [];
$uid = mb_substr((string) ($booking['uid'] ?? ''), 0, 100);

// What each trigger means for the booking's status (null: keep the current one).
$statusFor = [
    'BOOKING_REQUESTED' => 'requested',
    'BOOKING_PAYMENT_INITIATED' => 'awaiting_payment',
    'BOOKING_CREATED' => 'booked',
    'BOOKING_PAID' => null,
    'BOOKING_RESCHEDULED' => 'booked',
    'BOOKING_CANCELLED' => 'cancelled',
    'BOOKING_REJECTED' => 'rejected',
];
if (!array_key_exists($type, $statusFor) || $uid === '') {
    Http::json(200, ['ok' => true, 'ignored' => $type]);
}

$pdo = Db::connect($config);

// Once per delivery: Cal.com retries failed deliveries.
$eventId = hash('sha256', $type . '|' . $uid . '|' . (string) ($event['createdAt'] ?? '') . '|' . hash('sha256', $raw));
try {
    $pdo->prepare('INSERT INTO webhook_events (provider, event_id, event_type, received_at) VALUES (:p, :e, :t, UTC_TIMESTAMP())')
        ->execute(['p' => 'cal.com', 'e' => mb_substr($eventId, 0, 100), 't' => mb_substr($type, 0, 60)]);
} catch (PDOException $error) {
    if ($error->getCode() === '23000') {
        Http::json(200, ['ok' => true, 'duplicate' => true]);
    }
    throw $error;
}

$text = static fn ($value, int $max): ?string => is_string($value) && trim($value) !== '' ? mb_substr(trim($value), 0, $max) : null;
$time = static function ($value): ?string {
    if (!is_string($value) || $value === '') {
        return null;
    }
    $stamp = strtotime($value);
    return $stamp === false ? null : gmdate('Y-m-d H:i:s', $stamp);
};

$attendee = is_array($booking['attendees'][0] ?? null) ? $booking['attendees'][0] : [];
$email = $text($attendee['email'] ?? null, 254);
$price = isset($booking['price']) && is_numeric($booking['price']) && $booking['price'] >= 0 ? (int) round((float) $booking['price']) : null;
$currency = $text($booking['currency'] ?? null, 3);
$paid = $type === 'BOOKING_PAID' || ($booking['paid'] ?? false) === true;
$status = $statusFor[$type];
$now = gmdate('Y-m-d H:i:s');

$pdo->prepare(
    'INSERT INTO bookings (provider, booking_uid, event_type, title, status, start_at, end_at, attendee_name, attendee_email,
        attendee_tz, price, currency, paid, created_at, updated_at)
     VALUES (\'cal.com\', :uid, :event_type, :title, :status, :start_at, :end_at, :name, :email, :tz, :price, :currency, :paid, :now1, :now2)
     ON DUPLICATE KEY UPDATE
        event_type = COALESCE(VALUES(event_type), event_type),
        title = COALESCE(VALUES(title), title),
        status = IF(:keep = 1, status, VALUES(status)),
        start_at = COALESCE(VALUES(start_at), start_at),
        end_at = COALESCE(VALUES(end_at), end_at),
        attendee_name = COALESCE(VALUES(attendee_name), attendee_name),
        attendee_email = COALESCE(VALUES(attendee_email), attendee_email),
        attendee_tz = COALESCE(VALUES(attendee_tz), attendee_tz),
        price = COALESCE(VALUES(price), price),
        currency = COALESCE(VALUES(currency), currency),
        paid = GREATEST(paid, VALUES(paid)),
        updated_at = VALUES(updated_at)'
)->execute([
    'uid' => $uid,
    'event_type' => $text($booking['type'] ?? null, 100),
    'title' => $text($booking['title'] ?? null, 255),
    // A payment that arrives before the booking event creates the row as booked.
    'status' => $status ?? 'booked',
    'start_at' => $time($booking['startTime'] ?? null),
    'end_at' => $time($booking['endTime'] ?? null),
    'name' => $text($attendee['name'] ?? null, 120),
    'email' => $email !== null ? strtolower($email) : null,
    'tz' => $text($attendee['timeZone'] ?? null, 64),
    'price' => $price,
    'currency' => $currency !== null ? strtoupper($currency) : null,
    'paid' => $paid ? 1 : 0,
    'now1' => $now,
    'now2' => $now,
    // BOOKING_PAID only marks it paid: a cancelled booking stays cancelled.
    'keep' => $status === null ? 1 : 0,
]);

// A reschedule is a new booking in Cal.com; the old uid stops being upcoming.
$previous = $text($booking['rescheduleUid'] ?? ($booking['fromReschedule'] ?? null), 100);
if ($type === 'BOOKING_RESCHEDULED' && $previous !== null && $previous !== $uid) {
    $pdo->prepare('UPDATE bookings SET status = \'rescheduled\', updated_at = :now WHERE provider = \'cal.com\' AND booking_uid = :uid')
        ->execute(['now' => $now, 'uid' => $previous]);
}

Http::json(200, ['ok' => true]);
