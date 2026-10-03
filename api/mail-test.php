<?php

declare(strict_types=1);

/*
 * POST /api/mail-test.php (admin token) with {"to": "..."}: sends one test
 * message through the real SMTP settings. Used to check delivery and to get a
 * mail-tester.com score (send it to the address mail-tester shows).
 */

use Site\Http;
use Site\Mailer;
use Site\Validator;

$config = require __DIR__ . '/lib/bootstrap.php';
Http::requireMethod('POST');
Http::requireAdmin($config);

$input = Http::readJson(2048);
$validator = new Validator($input);
$to = $validator->email('to', 'Recipient');
if ($validator->fails()) {
    Http::error(422, 'invalid', 'Give a valid "to" address.', ['fields' => $validator->errors()]);
}

$mailer = new Mailer($config);
if (!$mailer->configured()) {
    Http::error(503, 'not_configured', 'Mail is not configured.');
}

$sent = $mailer->send(
    $to,
    'Test message from aayushmishra.engineer',
    "This is a test of the contact-form mail path (SMTP: {$config->string('smtp.host')}).\n\n"
    . "If it arrived in the inbox with SPF, DKIM and DMARC passing, the contact form will deliver too.\n\n"
    . "Sent " . gmdate('D, j M Y H:i') . " UTC.\n"
);

if (!$sent) {
    Http::error(502, 'mail_failed', 'The SMTP server refused the message.', ['detail' => $mailer->lastError()]);
}
Http::json(200, ['ok' => true, 'to' => $to]);
