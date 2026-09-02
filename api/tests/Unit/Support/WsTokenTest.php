<?php

declare(strict_types=1);

use App\Support\WsToken;

function wsToken(int $ttl = 60): WsToken
{
    return new WsToken(secret: 'unit-test-secret', ttlSeconds: $ttl);
}

it('accepts a freshly issued token', function () {
    $token = wsToken();

    expect($token->isValid($token->issue()))->toBeTrue();
});

it('rejects a token signed with a different secret', function () {
    $foreign = new WsToken(secret: 'other-secret', ttlSeconds: 60);

    expect(wsToken()->isValid($foreign->issue()))->toBeFalse();
});

it('rejects an expired token', function () {
    $token = wsToken(ttl: 30);
    $issuedAt = 1_000_000;

    $stale = $token->issue($issuedAt);

    expect($token->isValid($stale, now: $issuedAt + 31))->toBeFalse()
        ->and($token->isValid($stale, now: $issuedAt + 29))->toBeTrue();
});

it('rejects a tampered expiry', function () {
    $token = wsToken();
    [$exp, $sig] = explode('.', $token->issue());

    $forged = ((int) $exp + 3600).'.'.$sig;

    expect($token->isValid($forged))->toBeFalse();
});

it('rejects malformed tokens', function (string $bad) {
    expect(wsToken()->isValid($bad))->toBeFalse();
})->with([
    'empty' => '',
    'no separator' => 'abcdef',
    'too many parts' => '1.2.3',
    'non numeric expiry' => 'abc.'.hash_hmac('sha256', 'abc', 'unit-test-secret'),
]);

it('refuses to construct without a secret', function () {
    new WsToken(secret: '', ttlSeconds: 60);
})->throws(RuntimeException::class);
