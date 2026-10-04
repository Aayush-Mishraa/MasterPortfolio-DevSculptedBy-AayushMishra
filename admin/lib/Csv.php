<?php

declare(strict_types=1);

namespace Site\Admin;

/*
 * CSV downloads. A cell that a spreadsheet would read as a formula (it starts
 * with = + - @ or a tab/return) is prefixed with an apostrophe, so a lead who
 * types "=HYPERLINK(...)" into a form can't run anything in Excel or Sheets.
 */
final class Csv
{
    public static function cell(mixed $value): string
    {
        $text = $value === null ? '' : (string) $value;
        return $text !== '' && strpbrk($text[0], "=+-@\t\r") !== false ? "'" . $text : $text;
    }

    /** @param list<string> $header  @param iterable<array<int|string, mixed>> $rows */
    public static function toString(array $header, iterable $rows): string
    {
        $handle = fopen('php://temp', 'r+');
        fputcsv($handle, $header, ',', '"', '');
        foreach ($rows as $row) {
            fputcsv($handle, array_map([self::class, 'cell'], array_values($row)), ',', '"', '');
        }
        rewind($handle);
        $csv = (string) stream_get_contents($handle);
        fclose($handle);
        return $csv;
    }

    /** Sends the file as a download (with a BOM so Excel reads UTF-8) and stops. */
    public static function download(string $filename, array $header, iterable $rows): never
    {
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . preg_replace('/[^A-Za-z0-9._-]/', '-', $filename) . '"');
        echo "\xEF\xBB\xBF" . self::toString($header, $rows);
        exit;
    }
}
