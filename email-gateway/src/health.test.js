import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import Fastify from 'fastify';

async function healthServer(secret = 'fixture-secret') {
  const source = (await readFile(new URL('./server.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/gm, '').replace(/^main\(\)\.catch.*$/m, '');
  const box = vm.createContext({ Fastify, console, process: { env: { GATEWAY_SHARED_SECRET: secret }, on() {} },
    managerStatus: () => [{ id: 'private-channel', label: 'private-mailbox', lastError: 'private-error' }] });
  vm.runInContext(source + '\n globalThis.gatewayApp = app;', box);
  return box.gatewayApp;
}

test('public health response contains only liveness', async () => {
  const app = await healthServer();
  try {
    const response = await app.inject({ url: '/health' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
  } finally { await app.close(); }
});

test('detailed health requires the gateway secret over real HTTP', async () => {
  const app = await healthServer();
  try {
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const response = await fetch(address + '/status');
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'unauthorized' });
  } finally { await app.close(); }
});

test('authenticated status reports mailbox diagnostics', async () => {
  const app = await healthServer();
  try {
    const response = await app.inject({ url: '/status', headers: { authorization: 'Bearer fixture-secret' } });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().caixas[0].id, 'private-channel');
  } finally { await app.close(); }
});
