<?php

declare(strict_types=1);

namespace Site;

/** Thrown instead of exit() while Http::$testing is on, so tests can read the response. */
final class HttpExit extends \RuntimeException
{
    /** @param array<string, mixed> $data */
    public function __construct(public readonly int $status, public readonly array $data)
    {
        parent::__construct('HTTP ' . $status);
    }
}
