<?php

declare(strict_types=1);

namespace App\Support;

use RuntimeException;

/**
 * Short lived signed token handed to the browser so it can authenticate to the
 * WebSocket server without sharing a session or the signing secret.
 *
 * Wire format: "<exp>.<hex hmac-sha256 of the exp string>".
 * Deliberately trivial so the Node side can re-implement verification in a few
 * lines against the same shared secret.
 */
final class WsToken
{
    public function __construct(
        private readonly string $secret,
        private readonly int $ttlSeconds,
    ) {
        if ($this->secret === '') {
            throw new RuntimeException('WS token secret is not configured.');
        }

        if ($this->ttlSeconds < 1) {
            throw new RuntimeException('WS token TTL must be at least one second.');
        }
    }

    public function issue(?int $now = null): string
    {
        $expiresAt = ($now ?? time()) + $this->ttlSeconds;

        return $expiresAt.'.'.$this->sign((string) $expiresAt);
    }

    public function isValid(string $token, ?int $now = null): bool
    {
        $parts = explode('.', $token);

        if (count($parts) !== 2) {
            return false;
        }

        [$expiresAt, $signature] = $parts;

        if ($expiresAt === '' || ! ctype_digit($expiresAt)) {
            return false;
        }

        if (! hash_equals($this->sign($expiresAt), $signature)) {
            return false;
        }

        return (int) $expiresAt > ($now ?? time());
    }

    private function sign(string $payload): string
    {
        return hash_hmac('sha256', $payload, $this->secret);
    }
}
