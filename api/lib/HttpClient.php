<?php

declare(strict_types=1);

namespace Site;

/*
 * Outgoing HTTPS calls (Buttondown). cURL when the extension is there,
 * PHP streams otherwise. Never throws: a failure comes back as status 0.
 */
final class HttpClient
{
    /**
     * @param array<string, string> $headers
     * @return array{status: int, body: string, json: mixed}
     */
    public static function request(string $method, string $url, array $headers = [], ?string $body = null, int $timeout = 10): array
    {
        $lines = [];
        foreach ($headers as $name => $value) {
            $lines[] = "{$name}: {$value}";
        }
        $lines[] = 'User-Agent: aayushmishra.engineer-api/1.0';

        if (function_exists('curl_init')) {
            $handle = curl_init($url);
            curl_setopt_array($handle, [
                CURLOPT_CUSTOMREQUEST => $method,
                CURLOPT_HTTPHEADER => $lines,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_TIMEOUT => $timeout,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_FOLLOWLOCATION => false,
                CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP,
            ]);
            if ($body !== null) {
                curl_setopt($handle, CURLOPT_POSTFIELDS, $body);
            }
            $response = curl_exec($handle);
            $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
            if ($response === false) {
                error_log('[api] outgoing request failed: ' . curl_error($handle));
                $status = 0;
                $response = '';
            }
            curl_close($handle);
        } else {
            $context = stream_context_create(['http' => [
                'method' => $method,
                'header' => implode("\r\n", $lines),
                'content' => $body ?? '',
                'ignore_errors' => true,
                'timeout' => $timeout,
                'follow_location' => 0,
            ]]);
            $response = @file_get_contents($url, false, $context);
            $status = 0;
            foreach ($http_response_header ?? [] as $line) {
                if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $match)) {
                    $status = (int) $match[1];
                }
            }
            if ($response === false) {
                $response = '';
            }
        }
        return ['status' => $status, 'body' => (string) $response, 'json' => json_decode((string) $response, true)];
    }
}
