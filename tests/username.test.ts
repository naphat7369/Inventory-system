import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUsername } from '../src/lib/username.ts';

test('username is trimmed and normalized to uppercase', () => {
  assert.equal(normalizeUsername('  it.manager  '), 'IT.MANAGER');
  assert.equal(normalizeUsername('Admin_01'), 'ADMIN_01');
  assert.equal(normalizeUsername(null), '');
});
