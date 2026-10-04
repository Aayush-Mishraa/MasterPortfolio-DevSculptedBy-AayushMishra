<?php

declare(strict_types=1);

namespace Site;

/*
 * The lead magnets (Stage 3): what each one is called, which file it hands
 * out and what the follow-up email says. magnet.php records the request,
 * download.php serves the file behind a signed, expiring link.
 */
final class Magnets
{
    /** key => [title, file in api/assets/ (or null), newsletter source] */
    public const MAGNETS = [
        'checklist' => ['Release Readiness Checklist', 'release-readiness-checklist.pdf', 'checklist'],
        'ai-readiness' => ['AI-Agent Readiness report', null, 'quiz'],
        'starter-kit' => ['Playwright + AI Starter Kit waitlist', null, 'starter-kit'],
    ];

    public const LINK_TTL = 7 * 86400;

    public static function title(string $magnet): string
    {
        return self::MAGNETS[$magnet][0] ?? $magnet;
    }

    public static function file(string $magnet): ?string
    {
        return self::MAGNETS[$magnet][1] ?? null;
    }

    public static function source(string $magnet): string
    {
        return self::MAGNETS[$magnet][2] ?? 'footer';
    }

    /** A download link that works for LINK_TTL seconds. */
    public static function downloadUrl(Config $config, string $magnet, int $requestId, ?int $now = null): string
    {
        $expires = ($now ?? time()) + self::LINK_TTL;
        $query = http_build_query([
            'f' => $magnet,
            'r' => $requestId,
            'e' => $expires,
            's' => self::sign($config, $magnet, $requestId, $expires),
        ]);
        return rtrim($config->string('site_url'), '/') . '/api/download.php?' . $query;
    }

    public static function validLink(Config $config, string $magnet, int $requestId, int $expires, string $signature, ?int $now = null): bool
    {
        if ($expires < ($now ?? time()) || self::file($magnet) === null) {
            return false;
        }
        return hash_equals(self::sign($config, $magnet, $requestId, $expires), $signature);
    }

    private static function sign(Config $config, string $magnet, int $requestId, int $expires): string
    {
        $raw = hash_hmac('sha256', "download|{$magnet}|{$requestId}|{$expires}", $config->secret(), true);
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }
}
