<?php

declare(strict_types=1);

/*
 * POST /api/buttondown-webhook.php: Buttondown → our subscribers table.
 *
 * Server to server, so no origin check: the request must carry a valid
 * X-Buttondown-Signature (HMAC-SHA256 of the raw body with the webhook's
 * signing key). Each event is processed once (webhook_events). Handles
 * subscriber.created, .confirmed and .unsubscribed; anything else is
 * acknowledged and ignored.
 */

use Site\Buttondown;
use Site\Db;
use Site\Http;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('POST');

$raw = (string) file_get_contents('php://input', false, null, 0, 65537);
if (strlen($raw) > 65536) {
    Http::error(413, 'payload_too_large', 'Too large.');
}

$buttondown = new Buttondown($config);
if ($config->string('buttondown.webhook_secret') === '') {
    Http::error(503, 'not_configured', 'Webhook signing key not configured.');
}
if (!$buttondown->validSignature($raw, Http::header('X-Buttondown-Signature'))) {
    Http::error(401, 'bad_signature', 'Invalid signature.');
}

$event = json_decode($raw, true);
if (!is_array($event) || !is_string($event['event_type'] ?? null)) {
    Http::error(400, 'invalid_json', 'Unreadable event.');
}
$type = $event['event_type'];
$subscriberId = (string) ($event['data']['subscriber'] ?? '');
$eventId = (string) ($event['id'] ?? '') ?: hash('sha256', $raw);

$statusFor = [
    'subscriber.created' => 'pending',
    'subscriber.confirmed' => 'confirmed',
    'subscriber.unsubscribed' => 'unsubscribed',
];
if (!isset($statusFor[$type]) || $subscriberId === '') {
    Http::json(200, ['ok' => true, 'ignored' => $type]);
}

$pdo = Db::connect($config);

// Once per event: Buttondown retries deliveries.
try {
    $pdo->prepare('INSERT INTO webhook_events (provider, event_id, event_type, received_at) VALUES (:p, :e, :t, UTC_TIMESTAMP())')
        ->execute(['p' => 'buttondown', 'e' => mb_substr($eventId, 0, 100), 't' => mb_substr($type, 0, 60)]);
} catch (PDOException $error) {
    if ($error->getCode() === '23000') {
        Http::json(200, ['ok' => true, 'duplicate' => true]);
    }
    throw $error;
}

$status = $statusFor[$type];
$now = gmdate('Y-m-d H:i:s');
$update = $pdo->prepare(
    'UPDATE subscribers SET
        status = IF(:status1 = \'pending\' AND status <> \'pending\', status, :status2),
        confirmed_at = IF(:status3 = \'confirmed\', COALESCE(confirmed_at, :now1), confirmed_at),
        unsubscribed_at = IF(:status4 = \'unsubscribed\', :now2, unsubscribed_at),
        updated_at = :now3
     WHERE buttondown_id = :id'
);
$update->execute([
    'status1' => $status, 'status2' => $status, 'status3' => $status, 'status4' => $status,
    'now1' => $now, 'now2' => $now, 'now3' => $now, 'id' => $subscriberId,
]);

if ($update->rowCount() === 0) {
    // Signed up somewhere else (e.g. Buttondown's own page): look the address up.
    $remote = $buttondown->subscriber($subscriberId);
    $email = strtolower(trim((string) ($remote['email_address'] ?? $remote['email'] ?? '')));
    if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $pdo->prepare(
            'INSERT INTO subscribers (email, status, source, buttondown_id, created_at, updated_at, confirmed_at, unsubscribed_at)
             VALUES (:email, :status, :source, :id, :now, :now2, :confirmed, :unsubscribed)
             ON DUPLICATE KEY UPDATE status = VALUES(status), buttondown_id = VALUES(buttondown_id), updated_at = VALUES(updated_at),
               confirmed_at = COALESCE(confirmed_at, VALUES(confirmed_at)), unsubscribed_at = VALUES(unsubscribed_at)'
        )->execute([
            'email' => $email,
            'status' => $status,
            'source' => 'buttondown',
            'id' => $subscriberId,
            'now' => $now,
            'now2' => $now,
            'confirmed' => $status === 'confirmed' ? $now : null,
            'unsubscribed' => $status === 'unsubscribed' ? $now : null,
        ]);
    }
}

Http::json(200, ['ok' => true]);
