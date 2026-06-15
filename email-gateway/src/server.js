// Email gateway HTTP server. Runs alongside Chatwoot (separate process/port —
// it does NOT touch Chatwoot). Holds live IMAP connections (IDLE) per caixa and
// exposes a small authenticated API for the CRM's Edge Functions to call.
import 'dotenv/config';
import Fastify from 'fastify';
import { startAll, stopAll, managerStatus, getManager } from './idle.js';
import { startCommandLoop } from './commands.js';
import { getEmailCaixa } from './caixas.js';
import { fetchMessageBody } from './sync.js';
import { q } from './db.js';

const SECRET = process.env.GATEWAY_SHARED_SECRET;
const PORT = Number(process.env.PORT) || 8730;
const log = (...a) => console.log(new Date().toISOString(), ...a);

const app = Fastify({ logger: false });

// Shared-secret auth for privileged routes (called by Supabase Edge Functions).
function authed(req, reply, done) {
  if (!SECRET || req.headers.authorization !== `Bearer ${SECRET}`) {
    reply.code(401).send({ error: 'unauthorized' });
    return;
  }
  done();
}

// Health / status — handy for monitoring and for confirming caixas are connected.
app.get('/health', async () => ({ ok: true, caixas: managerStatus() }));

// Force a full resync of a caixa.
app.post('/caixas/:id/sync', { preHandler: authed }, async (req, reply) => {
  const m = getManager(req.params.id);
  if (!m) return reply.code(404).send({ error: 'caixa não encontrada' });
  try { await m.resync(); return { ok: true }; }
  catch (e) { return reply.code(503).send({ error: e.message }); }
});

// Lazy body fetch for one message (used when a message has no body cached yet).
app.post('/messages/:id/body', { preHandler: authed }, async (req, reply) => {
  const [msg] = await q(
    `SELECT m.id, m.uid, m.channel_id, f.path
       FROM email_messages m JOIN email_folders f ON f.id = m.folder_id
      WHERE m.id=$1`,
    [req.params.id],
  );
  if (!msg) return reply.code(404).send({ error: 'mensagem não encontrada' });
  const m = getManager(msg.channel_id);
  if (!m?.client?.usable) return reply.code(503).send({ error: 'caixa desligada' });
  const caixa = await getEmailCaixa(msg.channel_id);
  try {
    const body = await fetchMessageBody(m.client, caixa, msg);
    return { ok: true, body: { html: !!body?.html, text: !!body?.text, attachments: body?.attachments?.length ?? 0 } };
  } catch (e) {
    return reply.code(502).send({ error: e.message });
  }
});

async function main() {
  const n = await startAll();
  log(`${n} caixa(s) de email a arrancar`);
  startCommandLoop();
  await app.listen({ port: PORT, host: '0.0.0.0' });
  log(`Email gateway HTTP em :${PORT}`);
}

for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => { log('a desligar...'); await stopAll(); await app.close(); process.exit(0); });
}

main().catch((e) => { log('arranque falhou:', e.message); process.exit(1); });
