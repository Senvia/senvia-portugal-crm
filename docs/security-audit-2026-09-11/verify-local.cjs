const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const results = [];
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function compile(source) {
  return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
}
function declaration(file, name) {
  const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
  const node = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name);
  assert.ok(node, name);
  return node.getText(source).replace(/^export\s+/, '');
}
function chain(value, calls, table) {
  return new Proxy({}, { get(_, op) {
    if (op === 'then') return (ok, fail) => Promise.resolve(value).then(ok, fail);
    return (...args) => { calls.push({ table, op, args }); return chain(value, calls, table); };
  } });
}
function context(extra) {
  return vm.createContext({ Request, Response, URL, URLSearchParams, Blob, FormData,
    console: { log() {}, warn() {}, error() {} }, ...extra });
}
async function test(name, run) {
  try { results.push({ name, reproduced: true, evidence: await run() }); }
  catch (e) { results.push({ name, reproduced: false, error: e.message }); process.exitCode = 1; }
}
(async () => {
  for (const name of ['check-reminders', 'process-automation-queue', 'notify-new-trials', 'check-trial-status', 'check-fidelization-alerts']) {
    await test(`Anonymous reaches privileged database: ${name}`, async () => {
      const calls = [];
      const fake = { from: table => { calls.push({ table, op: 'from' }); return chain({ data: [], error: null }, calls, table); } };
      let handler;
      const source = ts.createSourceFile('index.ts', read(`supabase/functions/${name}/index.ts`), ts.ScriptTarget.Latest, true);
      const withoutImports = source.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(source)).join('\n');
      const box = context({ createClient: () => fake, serve: h => { handler = h; },
        Deno: { serve: h => { handler = h; }, env: { get: key => key === 'SUPABASE_URL' ? 'https://example.invalid' : 'FAKE_TEST_VALUE' } } });
      vm.runInContext(compile(withoutImports), box);
      const response = await handler(new Request('https://example.invalid', { method: 'POST', body: '{}' }));
      assert.ok(calls.some(c => c.op === 'from'));
      assert.notEqual(response.status, 401); assert.notEqual(response.status, 403);
      return { authorizationHeader: false, status: response.status, tables: [...new Set(calls.map(c => c.table))], network: 'mocked' };
    });
  }
  await test('Store orders accepts customer_id without identity proof', async () => {
    const calls = [];
    const fake = { from: table => chain({ data: [{ id: 'fixture-order', total: 120 }], error: null }, calls, table) };
    const box = context({ fake });
    vm.runInContext(compile(declaration('supabase/functions/store-api/index.ts', 'handleGetOrders')), box);
    const data = await box.handleGetOrders(fake, 'fixture-org', new URLSearchParams({ customer_id: 'other-customer' }));
    assert.equal(data.orders[0].id, 'fixture-order');
    assert.ok(!calls.some(c => c.table === 'customers'));
    return { returnedFixtureOrder: true, customerVerificationQueries: 0, network: 'mocked' };
  });
  await test('Gateway accepts foreign message in own-channel command', async () => {
    const own = { id: 'own-channel' };
    let altered;
    const box = context({ getEmailCaixa: async () => own, getManager: () => ({ client: { usable: true } }),
      getMsg: async () => ({ id: 'foreign-message', channel_id: 'foreign-channel' }),
      setFlag: async (_client, msg) => { altered = msg; } });
    vm.runInContext(compile(declaration('email-gateway/src/commands.js', 'execute')), box);
    await box.execute({ channel_id: own.id, type: 'mark_read', payload: { messageId: 'foreign-message' } });
    assert.equal(altered.channel_id, 'foreign-channel');
    return { cmdChannel: own.id, acceptedMessageChannel: altered.channel_id, imapAndDatabase: 'mocked' };
  });
  await test('Otto grants admin in another organization using global role', async () => {
    const calls = [];
    const fake = { from: table => chain({ data: table === 'user_roles' ? [{ role: 'admin' }] : table === 'organization_members' ? { id: 'member-B', role: 'viewer' } : { id: 'org-B', name: 'Fixture B', enabled_modules: [] }, error: null }, calls, table) };
    const box = context({ exports: {}, createClient: () => ({ ...fake, auth: { getUser: async () => ({ data: { user: { id: 'user-A' } } }) } }),
      computeOnboardingState: async () => ({}), resolveMode: () => 'normal',
      Deno: { env: { get: key => key === 'SUPABASE_ANON_KEY' ? 'anon-fixture' : 'fixture' } } });
    vm.runInContext(compile(declaration('supabase/functions/otto/lib/context.ts', 'loadContext')), box);
    const value = await box.loadContext(new Request('https://example.invalid', { headers: { Authorization: 'Bearer user-fixture' } }), 'org-B');
    assert.equal(value.ctx.isAdmin, true);
    return { memberRoleAtTarget: 'viewer', globalRoleElsewhere: 'admin', effectiveAdmin: value.ctx.isAdmin, network: 'mocked' };
  });
  await test('Transcription accepts HTTPS loopback URL', async () => {
    const file = 'supabase/functions/transcribe-audio/index.ts';
    const source = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
    const code = source.statements.filter(n => !ts.isImportDeclaration(n)).map(n => n.getText(source)).join('\n');
    let handler; const fetched = [];
    const box = context({ corsHeaders: {}, json: (body, status = 200) => new Response(JSON.stringify(body), { status }),
      getConfig: () => ({}), authOrgMember: async () => ({ admin: {}, userId: 'fixture' }),
      fetch: async url => { fetched.push(url); return null; },
      Deno: { serve: h => { handler = h; }, env: { get: () => 'fixture' } } });
    vm.runInContext(compile(code), box);
    await handler(new Request('https://example.invalid', { method: 'POST', body: JSON.stringify({ organization_id: 'fixture', url: 'https://127.0.0.1:8443/audio' }) }));
    assert.deepEqual(fetched, ['https://127.0.0.1:8443/audio']);
    return { blockedBeforeFetch: false, target: fetched[0], network: 'mocked; no socket opened' };
  });
  await test('Quoted email preserves executable event attribute', async () => {
    const box = context({});
    vm.runInContext(compile(declaration('src/components/email/EmailComposer.tsx', 'quoteHtml')), box);
    const quoted = box.quoteHtml({ from_name: 'Fixture Sender', from_address: 'fixture@example.invalid', html_body: '<img src="data:image/png,broken" onerror="document.getElementById(\'result\').textContent=\'EXECUTED: untrusted email handler\'">' });
    assert.ok(quoted.includes('onerror='));
    const fixture = '<!doctype html><meta charset="utf-8"><title>Local security reproduction</title><h1>Isolated email composer test</h1><p id="result">Waiting</p><div id="editor" contenteditable="true"></div><script>document.getElementById("editor").innerHTML=' + JSON.stringify(quoted) + ';</script>';
    fs.writeFileSync(path.join(__dirname, 'xss-fixture.html'), fixture);
    return { untrustedAttributePreserved: true, sourceFunction: 'quoteHtml', fixture: 'xss-fixture.html', browserExecution: 'separate check required' };
  });
  await test('CSV export preserves formula prefix', async () => {
    const XLSX = require('xlsx');
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet([{ Nome: '=1+1' }]));
    assert.ok(csv.includes('=1+1'));
    return { csv, spreadsheetExecution: 'not executed; formula interpretation depends on spreadsheet client' };
  });
  fs.writeFileSync(path.join(__dirname, 'local-results.json'), JSON.stringify({ scope: 'Local source with synthetic fixtures. No production traffic or credentials.', results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
