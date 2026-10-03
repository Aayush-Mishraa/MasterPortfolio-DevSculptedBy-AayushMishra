<?php

declare(strict_types=1);

namespace Site;

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

/*
 * Mail through authenticated SMTP (Hostinger), never PHP's mail(): SMTP mail
 * is signed with the domain's DKIM key and passes SPF, so it lands in the
 * inbox. Plain text only.
 */
final class Mailer
{
    private string $lastError = '';

    public function __construct(private Config $config)
    {
    }

    public function configured(): bool
    {
        return $this->config->hasMail() && class_exists(PHPMailer::class);
    }

    public function lastError(): string
    {
        return $this->lastError;
    }

    /**
     * @param array{reply_to?: string, reply_name?: string, headers?: array<string, string>} $options
     */
    public function send(string $to, string $subject, string $body, array $options = []): bool
    {
        $this->lastError = '';
        if (!$this->configured()) {
            $this->lastError = 'mail is not configured';
            return false;
        }
        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = $this->config->string('smtp.host');
            $mail->Port = (int) ($this->config->get('smtp.port') ?: 465);
            $secure = strtolower($this->config->string('smtp.secure'));
            if ($secure === 'ssl' || $secure === 'smtps') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            } elseif ($secure === 'tls' || $secure === 'starttls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $mail->SMTPSecure = '';
                $mail->SMTPAutoTLS = false;
            }
            // A local mail catcher has no login; Hostinger always does.
            $mail->SMTPAuth = $this->config->string('smtp.user') !== '';
            $mail->Username = $this->config->string('smtp.user');
            $mail->Password = (string) $this->config->get('smtp.pass', '');
            $mail->Timeout = 15;
            $mail->CharSet = PHPMailer::CHARSET_UTF8;
            $mail->Encoding = PHPMailer::ENCODING_QUOTED_PRINTABLE;

            $from = $this->config->string('smtp.from') ?: $this->config->string('smtp.user');
            $mail->setFrom($from, $this->config->string('smtp.from_name') ?: 'aayushmishra.engineer', false);
            $mail->Sender = $from;
            $mail->addAddress($to);
            if (!empty($options['reply_to'])) {
                $mail->addReplyTo($options['reply_to'], $options['reply_name'] ?? '');
            }
            foreach ($options['headers'] ?? [] as $name => $value) {
                $mail->addCustomHeader($name, $value);
            }
            $mail->Subject = self::headerSafe($subject);
            $mail->isHTML(false);
            $mail->Body = $body;
            $mail->send();
            return true;
        } catch (MailException|\Throwable $error) {
            $this->lastError = $mail->ErrorInfo ?: $error->getMessage();
            error_log('[api] mail failed: ' . $this->lastError);
            return false;
        }
    }

    /** One line, no control characters, at most 180 characters. */
    public static function headerSafe(string $text): string
    {
        $text = (string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $text);
        $text = trim((string) preg_replace('/\s+/u', ' ', $text));
        return mb_strlen($text) > 180 ? mb_substr($text, 0, 177) . '…' : $text;
    }
}
