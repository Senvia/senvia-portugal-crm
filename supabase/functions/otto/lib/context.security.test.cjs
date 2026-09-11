const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

async function run({ role = 'viewer', superAdmin = false, active = true, mfa = true } = {}) {
  const client = {
    rpc: async () => ({ data: active && (role === 'admin' || superAdmin), error: null }),
    auth: { getUser: async () => ({ data: { user: { id: 'caller' } }, error: null }) },
    from(table) {
      let rows = table === 'organization_members' ? [{ id: 'membership', user_id: 'caller', organization_id: 'org-b', role, is_active: active }] :
        table === 'user_roles' ? [{ id: 'global-role', user_id: 'caller', role: superAdmin ? 'super_admin' : 'admin' }] :
          table === 'organizations' ? [{ id: 'org-b', name: 'Fixture', enabled_modules: [] }] : [];
      let single = false;
      const q = new Proxy({}, { get(_, op) {
        if (op === 'then') return (resolve, reject) => Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(resolve, reject);
        return (...args) => {
          if (op === 'eq') rows = rows.filter(row => row[args[0]] === args[1]);
          if (op === 'in') rows = rows.filter(row => args[1].includes(row[args[0]]));
          if (op === 'maybeSingle') single = true;
          return q;
        };
      }});
      return q;
    },
  };
  const exports = {};
  const source = fs.readFileSync(__dirname + '/context.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name.includes('user-authorization') ? { meetsMfaPolicy: async () => mfa } :
    name.includes('onboarding') ? { computeOnboardingState: async () => ({}), resolveMode: () => 'normal' } : { createClient: () => client },
    Deno: { env: { get: () => 'fixture' } } });
  return exports.loadContext(new Request('https://example.invalid', { headers: { Authorization: 'Bearer user' } }), 'org-b');
}
test('Otto viewer in B does not inherit global admin from A', async () => {
  const result = await run();
  assert.equal(result.hasDataAccess, true);
  assert.equal(result.ctx.isAdmin, false);
});
test('Otto grants local administrator tools in the administered organization', async () => {
  assert.equal((await run({ role: 'admin' })).ctx.isAdmin, true);
});
test('Otto recognizes explicit super administrator even when local viewer', async () => {
  assert.equal((await run({ superAdmin: true })).ctx.isAdmin, true);
});
test('Otto refuses suspended member and insufficient MFA', async () => {
  assert.equal((await run({ active: false })).hasDataAccess, false);
  assert.equal((await run({ mfa: false })).hasDataAccess, false);
});
