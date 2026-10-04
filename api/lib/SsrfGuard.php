<?php

declare(strict_types=1);

namespace Site;

/*
 * F24: decides whether a visitor's URL is safe to scan. The scan itself runs
 * on a GitHub Actions runner (never on this server), and the job checks the
 * address again right before it loads the page (DNS can change in between).
 *
 * Accepted: http(s) on the default port, no user:password@, a public DNS name
 * whose every A/AAAA record is a public unicast address. Refused: IP
 * literals, localhost and internal names, private/loopback/link-local/CGNAT/
 * reserved/multicast ranges, cloud metadata addresses, and names that don't
 * resolve.
 */
final class SsrfGuard
{
    /** Ranges filter_var's NO_PRIV/NO_RES flags miss, as [network, prefix]. */
    private const EXTRA_BLOCKED = [
        ['0.0.0.0', 8],
        ['100.64.0.0', 10],     // carrier-grade NAT
        ['192.0.0.0', 24],      // IETF protocol assignments
        ['192.0.2.0', 24],      // documentation
        ['198.18.0.0', 15],     // benchmarking
        ['198.51.100.0', 24],
        ['203.0.113.0', 24],
        ['224.0.0.0', 4],       // multicast
        ['240.0.0.0', 4],
        ['64:ff9b::', 96],      // NAT64 (can reach IPv4 internals)
        ['2001:db8::', 32],
        ['ff00::', 8],
    ];

    /**
     * @param (callable(string): list<string>)|null $resolve host => IPs (tests inject a fake)
     * @return array{ok: bool, url: string, host: string, reason: string}
     */
    public static function check(string $raw, ?callable $resolve = null): array
    {
        $fail = static fn (string $reason): array => ['ok' => false, 'url' => '', 'host' => '', 'reason' => $reason];
        $raw = trim($raw);
        if ($raw === '' || strlen($raw) > 500 || preg_match('/[\s\x00-\x1F\x7F\\\\]/', $raw)) {
            return $fail('Enter a full web address, like https://example.com.');
        }
        if (preg_match('#^[a-z][a-z0-9+.-]*:#i', $raw) && !preg_match('#^https?://#i', $raw) && !preg_match('#^[^:/]+:\d+(/|$)#', $raw)) {
            return $fail('Only http:// and https:// addresses can be scanned.');
        }
        if (!preg_match('#^https?://#i', $raw)) {
            $raw = 'https://' . $raw;
        }
        $parts = parse_url($raw);
        if ($parts === false || empty($parts['host'])) {
            return $fail('That doesn\'t look like a web address.');
        }
        $scheme = strtolower($parts['scheme'] ?? '');
        if ($scheme !== 'http' && $scheme !== 'https') {
            return $fail('Only http:// and https:// addresses can be scanned.');
        }
        if (isset($parts['user']) || isset($parts['pass'])) {
            return $fail('Addresses with a username or password can\'t be scanned.');
        }
        if (isset($parts['port']) && !in_array((int) $parts['port'], [80, 443], true)) {
            return $fail('Only the standard ports (80 and 443) can be scanned.');
        }
        $host = strtolower(rtrim($parts['host'], '.'));
        if (str_starts_with($host, '[') || filter_var($host, FILTER_VALIDATE_IP)) {
            return $fail('Use the site\'s domain name, not an IP address.');
        }
        if (strlen($host) > 253 || !preg_match('/^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z][a-z0-9-]{1,62}$/', $host)) {
            return $fail('That domain name doesn\'t look right.');
        }
        if (preg_match('/(^|\.)(localhost|local|internal|intranet|lan|home|corp|localdomain|home\.arpa|arpa|test|invalid|example)$/', $host)) {
            return $fail('Only public websites can be scanned.');
        }

        $ips = ($resolve ?? [self::class, 'resolve'])($host);
        if (!$ips) {
            return $fail('That domain doesn\'t resolve. Check the spelling.');
        }
        foreach ($ips as $ip) {
            if (!self::isPublicIp($ip)) {
                return $fail('That address points to a private network, so it can\'t be scanned.');
            }
        }

        $path = $parts['path'] ?? '/';
        $query = isset($parts['query']) ? '?' . $parts['query'] : '';
        $port = isset($parts['port']) && !(($scheme === 'https' && (int) $parts['port'] === 443) || ($scheme === 'http' && (int) $parts['port'] === 80))
            ? ':' . $parts['port'] : '';
        return ['ok' => true, 'url' => "{$scheme}://{$host}{$port}{$path}{$query}", 'host' => $host, 'reason' => ''];
    }

    /** Every A and AAAA record of $host. @return list<string> */
    public static function resolve(string $host): array
    {
        $ips = [];
        $records = @dns_get_record($host, DNS_A | DNS_AAAA);
        foreach ($records ?: [] as $record) {
            if (!empty($record['ip'])) {
                $ips[] = $record['ip'];
            } elseif (!empty($record['ipv6'])) {
                $ips[] = $record['ipv6'];
            }
        }
        if (!$ips) {
            $ips = @gethostbynamel($host) ?: [];
        }
        return array_values(array_unique($ips));
    }

    public static function isPublicIp(string $ip): bool
    {
        // ::ffff:10.0.0.1 is an IPv4 address in disguise.
        if (preg_match('/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i', $ip, $match)) {
            $ip = $match[1];
        }
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return false;
        }
        foreach (self::EXTRA_BLOCKED as [$network, $prefix]) {
            if (self::inRange($ip, $network, $prefix)) {
                return false;
            }
        }
        return true;
    }

    private static function inRange(string $ip, string $network, int $prefix): bool
    {
        $a = @inet_pton($ip);
        $b = @inet_pton($network);
        if ($a === false || $b === false || strlen($a) !== strlen($b)) {
            return false;
        }
        $bytes = intdiv($prefix, 8);
        if (strncmp($a, $b, $bytes) !== 0) {
            return false;
        }
        $bits = $prefix % 8;
        if ($bits === 0) {
            return true;
        }
        $mask = (0xFF << (8 - $bits)) & 0xFF;
        return (ord($a[$bytes]) & $mask) === (ord($b[$bytes]) & $mask);
    }
}
