import assert from 'node:assert/strict';
import test from 'node:test';
import { SignJWT } from 'jose';
import { verifySessionToken } from '../src/lib/session-token.ts';

const key = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-default-key-change-in-production');

test('expired JWT sessions are rejected immediately', async () => {
  const token = await new SignJWT({ id: 'user-1', username: 'tester', role: 'ADMIN' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(key);
  assert.equal(await verifySessionToken(token), null);
});

test('unexpired JWT sessions remain valid', async () => {
  const token = await new SignJWT({ id: 'user-1', username: 'tester', role: 'ADMIN' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + 60)
    .sign(key);
  const session = await verifySessionToken(token);
  assert.equal(session?.id, 'user-1');
});
