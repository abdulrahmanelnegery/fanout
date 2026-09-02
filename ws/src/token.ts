import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies the short lived token issued by the Laravel `/ws-token` endpoint.
 *
 * Must stay byte for byte compatible with App\Support\WsToken on the PHP side:
 * token is "<exp>.<hex hmac-sha256(exp)>", signed with the shared secret, and
 * `exp` is a unix timestamp that must still be in the future.
 */
export function verifyWsToken(
  token: string,
  secret: string,
  now: number = Math.floor(Date.now() / 1000),
): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const [expiresAt, signature] = parts as [string, string];
  if (expiresAt === '' || !/^\d+$/.test(expiresAt)) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(expiresAt).digest('hex');
  if (!timingSafeEqualHex(expected, signature)) {
    return false;
  }

  return Number(expiresAt) > now;
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
