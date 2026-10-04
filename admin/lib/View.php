<?php

declare(strict_types=1);

namespace Site\Admin;

/*
 * HTML output. Everything printed from data goes through e(). Pages are
 * plain server-rendered HTML with one stylesheet and no JavaScript (the CSP
 * allows none).
 */
final class View
{
    public const NAV = [
        '/' => 'Overview',
        '/leads' => 'Leads',
        '/subscribers' => 'Subscribers',
        '/bookings' => 'Bookings',
        '/scans' => 'Scans',
        '/magnets' => 'Magnets',
        '/ask' => 'AI questions',
        '/neuralforge' => 'NeuralForge',
        '/audit' => 'Audit log',
        '/settings' => 'Settings',
    ];

    public static function e(mixed $value): string
    {
        return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function url(string $path = '/', array $query = []): string
    {
        $query = array_filter($query, static fn ($value) => $value !== null && $value !== '');
        return '/admin' . ($path === '/' ? '/' : $path) . ($query ? '?' . http_build_query($query) : '');
    }

    public static function csrfField(): string
    {
        return '<input type="hidden" name="_csrf" value="' . self::e(Session::csrfToken()) . '">';
    }

    public static function date(?string $utc, string $format = 'j M Y, H:i'): string
    {
        if (!$utc) {
            return '—';
        }
        $time = strtotime($utc . ' UTC');
        // Shown in IST, where the site's owner works.
        return $time ? self::e(gmdate($format, $time + 19800)) : '—';
    }

    /** A whole page: the signed-in layout, or the bare one for sign-in screens. */
    public static function page(string $title, string $body, ?string $active = null): never
    {
        $flash = Session::takeFlash();
        $signedIn = Session::userId() !== null && $active !== null;
        echo '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<meta name="robots" content="noindex, nofollow">'
            . '<title>' . self::e($title) . ' · Admin · aayushmishra.engineer</title>'
            . '<link rel="stylesheet" href="/admin/assets/admin.css?v=1"></head><body class="' . ($signedIn ? 'adm' : 'adm adm--bare') . '">';
        if ($signedIn) {
            echo '<header class="adm-top"><a class="adm-brand" href="' . self::url('/') . '">&lt;admin/&gt;</a>'
                . '<span class="adm-user">' . self::e(Session::username()) . '</span>'
                . '<form method="post" action="' . self::url('/logout') . '">' . self::csrfField()
                . '<button type="submit" class="adm-btn adm-btn--ghost">Sign out</button></form></header>'
                . '<nav class="adm-nav" aria-label="Admin"><ul>';
            foreach (self::NAV as $path => $label) {
                $current = $active === $path ? ' aria-current="page"' : '';
                echo '<li><a href="' . self::url($path) . '"' . $current . '>' . self::e($label) . '</a></li>';
            }
            echo '</ul></nav>';
        }
        echo '<main class="adm-main" id="main"><h1>' . self::e($title) . '</h1>';
        if ($flash) {
            $role = $flash[0] === 'error' ? 'alert' : 'status';
            echo '<p class="adm-flash adm-flash--' . self::e($flash[0]) . '" role="' . $role . '">' . self::e($flash[1]) . '</p>';
        }
        echo $body . '</main></body></html>';
        exit;
    }

    public static function redirect(string $path, array $query = []): never
    {
        header('Location: ' . self::url($path, $query), true, 303);
        exit;
    }

    /** A labelled <select>. @param array<string, string> $options value => label */
    public static function select(string $name, string $label, array $options, ?string $selected, string $id = ''): string
    {
        $id = $id ?: 'f-' . $name;
        $html = '<label for="' . self::e($id) . '">' . self::e($label) . '</label><select id="' . self::e($id) . '" name="' . self::e($name) . '">';
        foreach ($options as $value => $text) {
            $html .= '<option value="' . self::e($value) . '"' . ((string) $value === (string) $selected ? ' selected' : '') . '>' . self::e($text) . '</option>';
        }
        return $html . '</select>';
    }
}
