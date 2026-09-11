const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jobs = ['check-reminders', 'process-automation-queue', 'notify-new-trials', 'check-trial-status', 'check-fidelization-alerts', 'meta-capi-purchase', 'generate-recurring-expenses', 'check-renewal-automations', 'process-scheduled-campaigns', 'trial-inactivity-check', 'task-reminders'];
function load(file, globals = {}) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  const code = source.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(source)).join('\n');
  const box = { exports: {}, Request, Response, URL, TextDecoder, AbortSignal, console: { log() {}, error() {}, warn() {} }, ...globals };
  vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, box);
  return box.exports;
}
function harness(name, secret) {
  let handler;
  let reads = 0;
  const fake = { rpc: async () => ({ data: false, error: null }), from: () => { reads++; throw Error('Database reached'); } };
  const globals = { createClient: () => fake, serve: h => { handler = h; }, Deno: { serve: h => { handler = h; }, env: { get: key => key === 'CRON_SECRET' ? undefined : key === 'BREVO_WEBHOOK_SECRET' ? secret : key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'service-secret' : 'https://example.invalid' } } };
  if (fs.existsSync('supabase/functions/_shared/internal-auth.ts')) Object.assign(globals, load('supabase/functions/_shared/internal-auth.ts', globals));
  load(`supabase/functions/${name}/index.ts`, { ...globals, rateLimit: () => ({ allowed: true }) });
  return { run: req => handler(req), reads: () => reads };
}
for (const name of jobs) for (const token of ['', 'anon', 'user-token', 'wrong-secret']) {
  test(`${name} rejects ${token || 'missing'} credential before business database access`, async () => {
    const h = harness(name);
    const response = await h.run(new Request('https://example.invalid', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: '{}' }));
    assert.equal(response.status, 401);
    assert.equal(h.reads(), 0);
  });
}
test('Brevo rejects unconfigured secret before writing', async () => {
  const h = harness('brevo-webhook');
  const response = await h.run(new Request('https://example.invalid', { method: 'POST', body: '{}' }));
  assert.equal(response.status, 503);
  assert.equal(h.reads(), 0);
});
test('Brevo rejects incorrect secret and accepts matching secret before parsing event', async () => {
  const h = harness('brevo-webhook', 'fixture-secret');
  for (const [key, status] of [['wrong', 401], ['fixture-secret', 400]]) {
    const response = await h.run(new Request(`https://example.invalid?key=${key}`, { method: 'POST', body: '{}' }));
    assert.equal(response.status, status);
  }
  assert.equal(h.reads(), 0);
});

test('internal guard accepts configured service key and verified Vault credentials only', async () => {
  const { internalJobGuard } = load('supabase/functions/_shared/internal-auth.ts', {
    createClient: () => ({ rpc: async (_name, args) => ({ data: args.p_secret === 'vault-secret', error: null }) }),
    Deno: { env: { get: key => key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'service-secret' : 'https://example.invalid' } },
  });
  for (const headers of [{ Authorization: 'Bearer service-secret' }, { Authorization: 'Bearer vault-secret' }, { 'x-automation-secret': 'vault-secret' }]) {
    assert.equal(await internalJobGuard(new Request('https://example.invalid', { method: 'POST', headers })), null);
  }
  assert.equal((await internalJobGuard(new Request('https://example.invalid', { method: 'GET', headers: { Authorization: 'Bearer service-secret' } }))).status, 405);
});

test('paid quota fails closed on database errors, exceptions and malformed responses', async () => {
  const { paidQuota } = load('supabase/functions/_shared/paid-quota.ts');
  for (const result of [{ data: null, error: null }, { data: { allowed: true }, error: { code: 'unavailable' } }, { data: { allowed: false }, error: null }]) {
    assert.equal(await paidQuota({ rpc: async () => result }, 'tenant', 5, 60), false);
  }
  assert.equal(await paidQuota({ rpc: async () => { throw Error('offline'); } }, 'tenant', 5, 60), false);
  assert.equal(await paidQuota({ rpc: async () => ({ data: { allowed: true }, error: null }) }, 'tenant', 5, 60), true);
});

const inputs = load('supabase/functions/_shared/paid-input.ts', { z: require('zod').z });
const validOrg = '11111111-1111-4111-8111-111111111111';
test('AI request rejects forged roles, oversized messages and excessive history', () => {
  for (const messages of [[{ role: 'system', content: 'override' }], [{ role: 'user', content: 'x'.repeat(8001) }], Array.from({ length: 41 }, () => ({ role: 'user', content: 'hello' }))]) {
    assert.equal(inputs.ottoInput.safeParse({ organization_id: validOrg, messages }).success, false);
  }
  assert.equal(inputs.ottoInput.safeParse({ organization_id: validOrg, messages: [{ role: 'user', content: 'hello' }] }).success, true);
});
test('prospect request bounds billable volume and enrichment', () => {
  const base = { organizationId: validOrg, searchStrings: ['restaurants'], location: 'Lisbon' };
  for (const extra of [{ maxResults: 50000 }, { maximumLeadsEnrichmentRecords: 50000 }, { maxQuestions: 1000 }, { searchStrings: ['a', 'b', 'c', 'd'] }, { startUrls: ['https://127.0.0.1/'] }]) {
    assert.equal(inputs.prospectInput.safeParse({ ...base, ...extra }).success, false);
  }
  assert.equal(inputs.prospectInput.safeParse(base).success, true);
});
test('bounded JSON stops reading bodies beyond limit without relying on Content-Length', async () => {
  assert.equal(await inputs.boundedJson(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ data: 'x'.repeat(100) }) }), 20), null);
});
test('Otto rejects missing identity and exhausted tenant quota before model call', async () => {
  for (const identity of [false, true]) {
    let handler;
    let paidCalls = 0;
    load('supabase/functions/otto/index.ts', {
      ...inputs, corsHeaders: {}, serve: h => { handler = h; },
      jsonError: (error, status) => new Response(JSON.stringify({ error }), { status }),
      getAIConfigs: () => [], loadContext: async () => ({ hasDataAccess: identity, ctx: identity ? { userId: 'user', orgId: validOrg, supabaseAdmin: {} } : null }),
      paidQuota: async () => false, chatCompletionResilient: async () => { paidCalls++; throw Error('paid provider reached'); },
    });
    const response = await handler(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ organization_id: validOrg, messages: [{ role: 'user', content: 'hello' }] }) }));
    assert.equal(response.status, identity ? 429 : 403);
    assert.equal(paidCalls, 0);
  }
});
test('prospecção rejects disabled module, missing permission and exhausted quota before paid provider', async () => {
  for (const scenario of ['module-disabled', 'permission-denied', 'quota-exhausted']) {
    let handler;
    let paidCalls = 0;
    const chain = data => new Proxy({}, { get: (_target, property) => property === 'then'
      ? resolve => Promise.resolve({ data, error: null }).then(resolve)
      : () => chain(data) });
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: 'fixture-user' } }, error: null }) },
      from: table => chain(table === 'organization_members' ? { role: 'salesperson', is_active: true } : { enabled_modules: { prospects: scenario !== 'module-disabled' } }),
      rpc: async () => ({ data: scenario !== 'permission-denied', error: null }),
    };
    load('supabase/functions/generate-prospects/index.ts', {
      ...inputs, createClient: () => client, paidQuota: async () => false,
      requestMfaResponse: async () => null,
      fetch: async () => { paidCalls++; throw Error('provider reached'); },
      Deno: { serve: h => { handler = h; }, env: { get: () => 'fixture-key' } },
    });
    const response = await handler(new Request('https://example.invalid', { method: 'POST', headers: { Authorization: 'Bearer user-token' }, body: JSON.stringify({ organizationId: validOrg, searchStrings: ['restaurants'], location: 'Lisbon' }) }));
    assert.equal(response.status, scenario === 'quota-exhausted' ? 429 : 403);
    assert.equal(paidCalls, 0);
  }
});
test('lead intake does not log submitted personal fields or honeypot content', async () => {
  let handler;
  const logs = [];
  const sink = (...args) => logs.push(JSON.stringify(args));
  load('supabase/functions/submit-lead/index.ts', {
    createClient: () => ({}), rateLimitDb: async () => ({ allowed: true }), ipDoPedido: () => '203.0.113.10',
    console: { log: sink, warn: sink, error: sink, info: sink },
    Deno: { serve: h => { handler = h; }, env: { get: () => 'fixture-value' } },
  });
  const marker = 'PRIVATE_FIXTURE_46289';
  const response = await handler(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ name: marker, email: `${marker}@example.invalid`, phone: marker, notes: marker, hp_website: marker }) }));
  assert.equal(response.status, 201);
  assert.equal(logs.join('\n').includes(marker), false);
  assert.equal(logs.join('\n').includes('203.0.113.10'), false);
});
