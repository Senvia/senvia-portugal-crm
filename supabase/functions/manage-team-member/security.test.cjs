const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup({ callerRole = 'admin', active = true, mfa = true } = {}) {
  const writes = [];
  const memberships = [{ user_id: 'caller', organization_id: 'org-a', role: callerRole, is_active: true }, { user_id: 'target', organization_id: 'org-a', role: 'admin', is_active: active }];
  function from(table) {
    const filters = [];
    let mutation;
    const q = new Proxy({}, { get(_, op) {
      if (op === 'then') return (resolve, reject) => {
        let rows = table === 'organization_members' ? memberships : table === 'user_roles' ? [{ user_id: 'caller', role: 'admin' }] : [];
        for (const [kind, key, val] of filters) if (kind !== 'single') rows = rows.filter(row => kind === 'eq' ? row[key] === val : kind === 'neq' ? row[key] !== val : val.includes(row[key]));
        if (mutation) writes.push({ table, mutation, filters });
        return Promise.resolve({ data: q.singleResult ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
      };
      if (op === 'singleResult') return filters.some(f => f[0] === 'single');
      return (...args) => {
        if (['eq', 'neq', 'in'].includes(op)) filters.push([op, ...args]);
        if (['maybeSingle', 'single'].includes(op)) filters.push(['single']);
        if (['update', 'delete', 'insert', 'upsert'].includes(op)) mutation = [op, ...args];
        return q;
      };
    }});
    return q;
  }
  const client = { from, rpc: async name => ({ data: name === 'is_org_admin' ? callerRole === 'admin' : mfa, error: null }), auth: {
    getUser: async () => ({ data: { user: { id: 'caller' } }, error: null }),
    admin: { updateUserById: async (...args) => { writes.push({ table: 'auth.users', args }); return { error: null }; }, getUserById: async () => ({ data: { user: { id: 'target' } }, error: null }) },
  }};
  let handler;
  const source = fs.readFileSync(__dirname + '/index.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports: {}, require: name => name.includes('user-authorization') ? { meetsMfaPolicy: async () => mfa, requestMfaResponse: async () => mfa ? null : new Response('{}', { status: 403 }) } : { createClient: () => client },
    Request, Response, console: { log() {}, error() {} }, Deno: { env: { get: () => 'fixture' }, serve: fn => { handler = fn; } } });
  return { writes, run: async body => handler(new Request('https://example.invalid', { method: 'POST', headers: { Authorization: 'Bearer fixture' }, body: JSON.stringify(body) })) };
}

test('local administrator cannot choose a global password', async () => {
  const env = setup();
  const response = await env.run({ action: 'change_password', organization_id: 'org-a', user_id: 'target', new_password: 'not-a-real-password' });
  assert.equal(response.status, 403);
  assert.deepEqual(env.writes, []);
});
test('local removal affects membership only and does not ban identity', async () => {
  const env = setup();
  const response = await env.run({ action: 'delete_member', organization_id: 'org-a', user_id: 'target' });
  assert.equal(response.status, 200);
  assert.ok(env.writes.length > 0);
  assert.ok(env.writes.every(w => w.table === 'organization_members'));
});
test('role change remains scoped to the selected organization', async () => {
  const env = setup();
  const response = await env.run({ action: 'change_role', organization_id: 'org-a', user_id: 'target', new_role: 'viewer' });
  assert.equal(response.status, 200);
  assert.ok(env.writes.every(w => w.table === 'organization_members' && w.filters.some(f => f[1] === 'organization_id' && f[2] === 'org-a')));
});
test('insufficient MFA is denied before writes', async () => {
  const env = setup({ mfa: false });
  assert.equal((await env.run({ action: 'delete_member', organization_id: 'org-a', user_id: 'target' })).status, 403);
  assert.deepEqual(env.writes, []);
});
test('viewer cannot use global admin role to manage local members', async () => {
  const env = setup({ callerRole: 'viewer' });
  assert.equal((await env.run({ action: 'delete_member', organization_id: 'org-a', user_id: 'target' })).status, 403);
  assert.deepEqual(env.writes, []);
});
test('reactivation only updates the inactive local membership', async () => {
  const env = setup({ active: false });
  assert.equal((await env.run({ action: 'toggle_status', organization_id: 'org-a', user_id: 'target' })).status, 200);
  assert.equal(env.writes.length, 1);
  assert.equal(env.writes[0].table, 'organization_members');
  assert.equal(env.writes[0].mutation[1].is_active, true);
});
test('mutation must explicitly name its organization', async () => {
  const env = setup();
  assert.equal((await env.run({ action: 'delete_member', user_id: 'target' })).status, 400);
  assert.deepEqual(env.writes, []);
});
test('local admin cannot edit another account contact identity', async () => {
  const env = setup();
  assert.equal((await env.run({ action: 'update_profile', organization_id: 'org-a', user_id: 'target', email: 'changed@example.invalid' })).status, 403);
  assert.deepEqual(env.writes, []);
});
