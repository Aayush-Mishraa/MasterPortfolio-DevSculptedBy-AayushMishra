<?php

declare(strict_types=1);

namespace Site\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Site\Config;
use Site\FormToken;

final class FormTokenTest extends TestCase
{
    private FormToken $tokens;

    protected function setUp(): void
    {
        $this->tokens = new FormToken(Config::fromArray(test_config()));
    }

    public function testAValidTokenPassesAfterTheMinimumAge(): void
    {
        $token = $this->tokens->issue('contact', 1000);
        $this->assertSame('ok', $this->tokens->verify($token, 'contact', 1000 + FormToken::MIN_AGE)['reason']);
    }

    public function testTooNewTellsHowLongToWait(): void
    {
        $token = $this->tokens->issue('contact', 1000);
        $result = $this->tokens->verify($token, 'contact', 1001);
        $this->assertFalse($result['valid']);
        $this->assertSame('too_new', $result['reason']);
        $this->assertSame(FormToken::MIN_AGE - 1, $result['wait']);
    }

    public function testExpired(): void
    {
        $token = $this->tokens->issue('contact', 1000);
        $this->assertSame('expired', $this->tokens->verify($token, 'contact', 1000 + FormToken::MAX_AGE + 1)['reason']);
    }

    public function testBoundToItsForm(): void
    {
        $token = $this->tokens->issue('subscribe', 1000);
        $this->assertSame('form', $this->tokens->verify($token, 'contact', 1010)['reason']);
    }

    public function testTamperingIsCaught(): void
    {
        $token = $this->tokens->issue('contact', 1000);
        [$payload, $signature] = explode('.', $token);
        $forged = rtrim(strtr(base64_encode(json_encode(['f' => 'contact', 't' => 1, 'n' => 'x'])), '+/', '-_'), '=');
        $this->assertSame('signature', $this->tokens->verify($forged . '.' . $signature, 'contact', 1010)['reason']);
        $this->assertSame('malformed', $this->tokens->verify('nonsense', 'contact', 1010)['reason']);
        $this->assertSame('missing', $this->tokens->verify('', 'contact', 1010)['reason']);
    }

    public function testAnotherSecretRejects(): void
    {
        $token = $this->tokens->issue('contact', 1000);
        $other = new FormToken(Config::fromArray(test_config(['app_secret' => str_repeat('o', 40)])));
        $this->assertSame('signature', $other->verify($token, 'contact', 1010)['reason']);
    }
}
