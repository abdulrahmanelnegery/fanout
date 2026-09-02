import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyWsToken } from '../src/token.js';

const SECRET = 'shared-secret';

function sign(expiresAt: number, secret = SECRET): string {
  const exp = String(expiresAt);
  return `${exp}.${createHmac('sha256', secret).update(exp).digest('hex')}`;
}

describe('verifyWsToken', () => {
  it('accepts a token signed with the shared secret that has not expired', () => {
    const token = sign(1_000_100);
    expect(verifyWsToken(token, SECRET, 1_000_000)).toBe(true);
  });

  it('rejects a token whose expiry has passed', () => {
    const token = sign(1_000_000);
    expect(verifyWsToken(token, SECRET, 1_000_001)).toBe(false);
  });

  it('rejects a token signed with a different secret', () => {
    const token = sign(1_000_100, 'other-secret');
    expect(verifyWsToken(token, SECRET, 1_000_000)).toBe(false);
  });

  it('rejects a token with a tampered expiry', () => {
    const token = sign(1_000_100);
    const [, signature] = token.split('.') as [string, string];
    expect(verifyWsToken(`9999999999.${signature}`, SECRET, 1_000_000)).toBe(false);
  });

  it.each([
    ['', 'empty string'],
    ['no-separator', 'missing separator'],
    ['1.2.3', 'too many segments'],
    [`abc.${createHmac('sha256', SECRET).update('abc').digest('hex')}`, 'non numeric expiry'],
  ])('rejects malformed token: %s (%s)', (token) => {
    expect(verifyWsToken(token, SECRET, 1_000_000)).toBe(false);
  });
});
