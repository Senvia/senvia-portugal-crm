import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { meetsMfaPolicy } from './user-authorization.ts';

test('MFA rejects a denied or unavailable policy and accepts only true', async () => {
  for (const data of [false, null, 'true', undefined]) {
    assert.equal(await meetsMfaPolicy({ rpc: async () => ({ data, error: null }) }, 'user-a'), false);
  }
  assert.equal(await meetsMfaPolicy({ rpc: async () => ({ data: true, error: null }) }, 'user-a'), true);
  assert.equal(await meetsMfaPolicy({ rpc: async () => ({ data: true, error: new Error('unavailable') }) }, 'user-a'), false);
});

test('MFA binds its policy query to the verified user', async () => {
  const calls: unknown[] = [];
  await meetsMfaPolicy({ rpc: async (name, args) => { calls.push([name, args]); return { data: true, error: null }; } }, 'user-b');
  assert.deepEqual(calls, [['meets_mfa_policy', { _user_id: 'user-b' }]]);
});
