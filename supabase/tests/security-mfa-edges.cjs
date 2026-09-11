const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const root = path.resolve(__dirname, '../..');
const names = 'notify-finance-request notify-request-status cancel-invoice admin-stripe-stats buy-extra-seats create-checkout check-subscription check-prospect-job generate-receipt customer-portal create-credit-note get-invoice-details issue-invoice-receipt keyinvoice-auth issue-invoice meta-media meta-send send-access-email send-proposal-email send-invoice-email send-push-notification stripe-connect send-template-email stripe-product-sync stripe-sale-checkout sync-campaign-sends sync-credit-notes sync-invoices sync-invoicexpress-items update-invoicexpress-item'.split(' ');
const body = { organization_id: 'fixture-org', organizationId: 'fixture-org', campaignId: 'fixture-campaign', to: 'fixture@example.invalid', clientName: 'Fixture', proposalCode: 'Fixture', recipients: [{ email: 'fixture@example.invalid' }], templateId: 'fixture-template' };
function sourceFor(name) {
  const file = path.join(root, 'supabase/functions', name, 'index.ts');
  return ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
}
function compile(source) {
  return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
}
async function run(name, authenticated, internal = false) {
  let handler;
  let verified = false;
  let checked = false;
  let privileged = false;
  const client = { auth: { getUser: async () => {
    verified = true;
    return { data: { user: authenticated ? { id: 'fixture-user', email: 'fixture@example.invalid' } : null }, error: authenticated ? null : new Error('Invalid session') };
  } }, from: () => { privileged = true; throw new Error('Database operation reached'); }, rpc: () => { privileged = true; throw new Error('Privileged RPC reached'); } };
  const box = vm.createContext({ Request, Response, URL, URLSearchParams, TextEncoder, TextDecoder, crypto,
    console: { log() {}, warn() {}, error() {} }, exports: {},
    createClient: () => client, serviceClient: () => client,
    Stripe: class {},
    requestMfaResponse: async (_req, userId) => {
      assert.ok(verified && authenticated);
      assert.equal(userId, 'fixture-user');
      checked = true;
      return new Response(JSON.stringify({ error: 'MFA_REQUIRED' }), { status: 403 });
    },
    serve: callback => { handler = callback; },
    Deno: { serve: callback => { handler = callback; }, env: { get: key => key === 'SUPABASE_URL' ? 'https://fixture.invalid' : 'fixture-secret' } },
    fetch: () => { throw new Error('Provider request before MFA'); },
  });
  const source = sourceFor(name);
  const text = source.statements.filter(node => !ts.isImportDeclaration(node)).map(node => node.getText(source)).join('\n');
  vm.runInContext(compile(text), box);
  const req = new Request('https://fixture.invalid/functions/v1/' + name, { method: 'POST', headers: { Authorization: internal ? 'Bearer fixture-secret' : 'Bearer fixture-user-token' }, body: JSON.stringify(body) });
  const response = name === 'stripe-connect' ? await box.authenticate(req, 'fixture-org', true) : await handler(req);
  if (internal) {
    assert.equal(checked, false, `${name}: internal service must not require user MFA`);
    assert.ok(privileged, `${name}: trusted service reaches existing business logic`);
    return;
  }
  assert.equal(privileged, false, `${name}: unauthorized session cannot reach privileged work`);
  assert.ok(verified, `${name}: verified session must precede policy`);
  assert.equal(checked, authenticated, `${name}: MFA receives verified users only`);
  if (authenticated) {
    assert.equal(response.status, 403, name);
    assert.equal((await response.json()).error, 'MFA_REQUIRED', name);
  } else assert.ok(response.status >= 400, `${name}: invalid identity rejected`);
}
async function metaPolicy(allowed) {
  const source = sourceFor('meta-connect');
  const functions = source.statements.filter(node => ts.isFunctionDeclaration(node) && ['membroDaOrg', 'utilizadorDoPedido'].includes(node.name?.text)).map(node => node.getText(source)).join('\n');
  let queries = 0;
  const client = { auth: { getUser: async () => ({ data: { user: { id: 'fixture-user' } } }) }, rpc: async () => { queries++; return { data: true, error: null }; } };
  const box = vm.createContext({ Response, corsHeaders: {}, requestMfaResponse: async () => allowed ? null : new Response('{}', { status: 403 }) });
  vm.runInContext(compile(functions), box);
  const req = new Request('https://fixture.invalid', { headers: { Authorization: 'Bearer fixture-user-token' } });
  const member = await box.membroDaOrg(req, 'fixture-org', client);
  const user = await box.utilizadorDoPedido(req, client);
  assert.equal(member.ok, allowed);
  assert.equal(queries, allowed ? 1 : 0);
  if (allowed) assert.equal(user.id, 'fixture-user');
  else { assert.equal(member.status, 403); assert.equal(user.status, 403); }
}
(async () => {
  for (const name of names) {
    await run(name, true);
    await run(name, false);
    console.log(`PASS ${name}: AAL1 and invalid session rejected before privileged work`);
  }
  for (const name of ['keyinvoice-auth', 'send-proposal-email', 'send-template-email', 'send-push-notification']) {
    await run(name, false, true);
    console.log(`PASS ${name}: trusted service branch preserved`);
  }
  await metaPolicy(false);
  await metaPolicy(true);
  console.log('PASS meta-connect: both authentication helpers deny/allow policy with correct propagation');
})().catch(error => { console.error(error); process.exitCode = 1; });
