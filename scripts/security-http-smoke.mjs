import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';

const executable = resolve('node_modules/deno', process.platform === 'win32' ? 'deno.exe' : 'deno');
const scenarios = [
  { name: 'check-reminders', status: 401, body: {}, expected: 'Unauthorized' },
  { name: 'brevo-webhook', status: 503, body: {}, expected: 'Webhook unavailable' },
  { name: 'transcribe-audio', status: 400, body: { organization_id: '11111111-1111-4111-8111-111111111111', url: 'https://127.0.0.1/private' }, expected: 'Identificação do anexo inválida' },
];

for (const scenario of scenarios) {
  const child = spawn(executable, [
    'run', '--no-check', '--node-modules-dir=none', '--no-prompt',
    '--allow-env', '--allow-net=0.0.0.0:8000,127.0.0.1:8000',
    `supabase/functions/${scenario.name}/index.ts`,
  ], {
    windowsHide: true,
    env: { ...process.env, SUPABASE_URL: 'http://127.0.0.1:1', SUPABASE_SERVICE_ROLE_KEY: 'fixture-service', SUPABASE_ANON_KEY: 'fixture-anon', BREVO_WEBHOOK_SECRET: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stopped = once(child, 'exit');
  let output = '';
  try {
    await new Promise((resolveReady, reject) => {
      const timer = setTimeout(() => reject(new Error(`Startup timed out: ${output.slice(-1000)}`)), 45000);
      const consume = chunk => {
        output += chunk.toString();
        if (/Listening on/.test(output)) { clearTimeout(timer); resolveReady(); }
      };
      child.stdout.on('data', consume);
      child.stderr.on('data', consume);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exited ${code}: ${output.slice(-1000)}`)); });
    });
    const response = await fetch('http://127.0.0.1:8000', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario.body), signal: AbortSignal.timeout(5000),
    });
    const body = await response.text();
    assert.equal(response.status, scenario.status);
    assert.ok(body.includes(scenario.expected), body);
    console.log(`PASS real HTTP ${scenario.name}: ${response.status} ${body}`);
  } finally {
    child.kill();
    await stopped;
  }
}
