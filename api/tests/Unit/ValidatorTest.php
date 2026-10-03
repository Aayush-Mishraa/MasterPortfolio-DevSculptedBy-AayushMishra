<?php

declare(strict_types=1);

namespace Site\Tests\Unit;

use PHPUnit\Framework\TestCase;
use Site\Validator;

final class ValidatorTest extends TestCase
{
    public function testTextIsTrimmedAndCollapsed(): void
    {
        $validator = new Validator(['name' => "  Ada \t Lovelace\n "]);
        $this->assertSame('Ada Lovelace', $validator->text('name', 1, 100, 'Name'));
        $this->assertFalse($validator->fails());
    }

    public function testMultilineKeepsNewlinesButDropsControlCharacters(): void
    {
        $validator = new Validator(['message' => "Hello\r\nworld\x07\n\n\n\n\nbye"]);
        $this->assertSame("Hello\nworld\n\n\nbye", $validator->text('message', 1, 100, 'Message', true));
    }

    public function testLengthLimits(): void
    {
        $validator = new Validator(['short' => 'abc', 'long' => str_repeat('x', 11), 'empty' => '']);
        $validator->text('short', 5, 10, 'Short');
        $validator->text('long', 1, 10, 'Long');
        $validator->text('empty', 1, 10, 'Empty');
        $this->assertSame(
            ['short' => 'Short needs at least 5 characters.', 'long' => 'Long can be at most 10 characters.', 'empty' => 'Empty is required.'],
            $validator->errors()
        );
    }

    public function testMultibyteLengthCountsCharacters(): void
    {
        $validator = new Validator(['name' => str_repeat('é', 10)]);
        $validator->text('name', 1, 10, 'Name');
        $this->assertFalse($validator->fails());
    }

    public function testEmail(): void
    {
        $good = new Validator(['email' => ' Ada@Example.COM ']);
        $this->assertSame('ada@example.com', $good->email('email'));
        $this->assertFalse($good->fails());

        foreach (['', 'nope', "a@b.co\r\nBcc: x@y.z", 'a@b', str_repeat('a', 250) . '@b.co'] as $bad) {
            $validator = new Validator(['email' => $bad]);
            $validator->email('email');
            $this->assertTrue($validator->fails(), "should reject: {$bad}");
        }
    }

    public function testOneOfAndListOf(): void
    {
        $validator = new Validator(['intent' => 'audit', 'topics' => ['cicd', 'cicd', 'mobile'], 'bad' => 'x']);
        $this->assertSame('audit', $validator->oneOf('intent', ['audit', 'hello'], 'intent'));
        $this->assertSame(['cicd', 'mobile'], $validator->listOf('topics', ['cicd', 'mobile'], 8, 'topics'));
        $this->assertNull($validator->oneOf('bad', ['a'], 'thing'));
        $this->assertSame('hello', $validator->oneOf('missing', ['hello'], 'intent', 'hello'));
        $this->assertArrayHasKey('bad', $validator->errors());

        $notAList = new Validator(['topics' => 'cicd']);
        $notAList->listOf('topics', ['cicd'], 8, 'topics');
        $this->assertTrue($notAList->fails());
    }
}
