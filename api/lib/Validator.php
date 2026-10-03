<?php

declare(strict_types=1);

namespace Site;

/*
 * Server-side validation for form input. Collects one message per field;
 * every accepted value comes back trimmed, with control characters removed.
 */
final class Validator
{
    /** @var array<string, string> */
    private array $errors = [];

    /** @param array<string, mixed> $data */
    public function __construct(private array $data)
    {
    }

    /** Plain text. Newlines survive only when $multiline. */
    public function text(string $field, int $min, int $max, string $label, bool $multiline = false): string
    {
        $value = self::clean($this->data[$field] ?? '', $multiline);
        $length = mb_strlen($value);
        if ($min > 0 && $length === 0) {
            $this->errors[$field] = "{$label} is required.";
        } elseif ($length < $min) {
            $this->errors[$field] = "{$label} needs at least {$min} characters.";
        } elseif ($length > $max) {
            $this->errors[$field] = "{$label} can be at most {$max} characters.";
        }
        return $value;
    }

    public function email(string $field, string $label = 'Email'): string
    {
        $value = self::clean($this->data[$field] ?? '', false);
        if ($value === '') {
            $this->errors[$field] = "{$label} is required.";
        } elseif (strlen($value) > 254 || filter_var($value, FILTER_VALIDATE_EMAIL) === false) {
            $this->errors[$field] = 'That email address doesn\'t look right.';
        }
        return strtolower($value);
    }

    /** @param list<string> $allowed */
    public function oneOf(string $field, array $allowed, string $label, ?string $default = null): ?string
    {
        $value = $this->data[$field] ?? null;
        if (($value === null || $value === '') && $default !== null) {
            return $default;
        }
        if (($value === null || $value === '') ) {
            return null;
        }
        if (!is_string($value) || !in_array($value, $allowed, true)) {
            $this->errors[$field] = "Pick a valid {$label}.";
            return null;
        }
        return $value;
    }

    /**
     * @param list<string> $allowed
     * @return list<string>
     */
    public function listOf(string $field, array $allowed, int $max, string $label): array
    {
        $value = $this->data[$field] ?? [];
        if (!is_array($value)) {
            $this->errors[$field] = "Pick valid {$label}.";
            return [];
        }
        $picked = [];
        foreach ($value as $item) {
            if (!is_string($item) || !in_array($item, $allowed, true)) {
                $this->errors[$field] = "Pick valid {$label}.";
                return [];
            }
            $picked[$item] = true;
        }
        if (count($picked) > $max) {
            $this->errors[$field] = "Pick at most {$max} {$label}.";
        }
        return array_keys($picked);
    }

    public function fails(): bool
    {
        return $this->errors !== [];
    }

    /** @return array<string, string> */
    public function errors(): array
    {
        return $this->errors;
    }

    public static function clean(mixed $value, bool $multiline): string
    {
        if (!is_string($value)) {
            $value = is_scalar($value) ? (string) $value : '';
        }
        if (!mb_check_encoding($value, 'UTF-8')) {
            $value = mb_convert_encoding($value, 'UTF-8', 'UTF-8');
        }
        $value = str_replace(["\r\n", "\r"], "\n", $value);
        // Control characters out (tabs and, for messages, newlines stay).
        $value = (string) preg_replace($multiline ? '/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u' : '/[\x00-\x1F\x7F]/u', '', $value);
        if ($multiline) {
            $value = (string) preg_replace("/\n{4,}/", "\n\n\n", $value);
        } else {
            $value = (string) preg_replace('/\s+/u', ' ', $value);
        }
        return trim($value);
    }
}
