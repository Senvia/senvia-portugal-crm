// Full sync of one caixa: ALL folders' headers + body backfill, so every folder
// (Entrada/Enviados/Spam/Lixo/Arquivo...) has real content in the read-only UI.
// Run: $env:DATABASE_URL="..."; node src/sync-all.js [perFolder] [bodyCap]
import 'dotenv/config';
import { ImapFlow } from 'imapflow';
import { q, pool } from './db.js';
import { syncFolders, syncFolderMessages, fetchMessageBody } from './sync.js';

const host = process.env.TEST_IMAP_HOST;
const port = Number(process.env.TEST_IMAP_PORT) || 993;
const secure = process.env.TEST_IMAP_SECURE !== 'false';
const user = process.env.TEST_IMAP_USER;
const pass = process.env.TEST_IMAP_PASSWORD;
const PER_FOLDER = Number(process.argv[2]) || 40;
const BODY_CAP = Number(process.argv[3]) || 150;

const [channel] = await q(
  `SELECT id, organization_id, label FROM messaging_channels
   WHERE channel_type='email' ORDER BY created_at LIMIT 1`,
);
console.log(`Caixa: ${channel.label}\n`);

const client = new ImapFlow({ host, port, secure, auth: { user, pass }, logger: false });
await client.connect();
console.log('✓ IMAP ligado\n── Pastas ──');

const byPath = await syncFolders(client, channel);
for (const f of byPath.values()) {
  // Skip non-selectable / empty parents quietly
  let n = 0;
  try { n = await syncFolderMessages(client, channel, f, PER_FOLDER); } catch (e) { /* parent */ }
  if (n) console.log(`  ${f.role.padEnd(8)} ${f.path}: ${n}`);
}

// Body backfill across all folders (lazy fetch comes with the live gateway).
const pending = await q(
  `SELECT m.id, m.uid, f.path
     FROM email_messages m JOIN email_folders f ON f.id=m.folder_id
    WHERE m.channel_id=$1 AND m.body_fetched=false
    ORDER BY m.date DESC LIMIT $2`,
  [channel.id, BODY_CAP],
);
console.log(`\n── Corpos: ${pending.length} em falta (cap ${BODY_CAP}) ──`);
let done = 0;
for (const msg of pending) {
  try { await fetchMessageBody(client, channel, msg); done++; if (done % 25 === 0) console.log(`  ${done}/${pending.length}`); }
  catch (e) { /* skip */ }
}
console.log(`✓ ${done} corpos`);

await client.logout().catch(() => {});

const summary = await q(
  `SELECT f.role, f.name, count(m.id)::int AS msgs
     FROM email_folders f LEFT JOIN email_messages m ON m.folder_id=f.id
    WHERE f.channel_id=$1 GROUP BY f.id, f.role, f.name ORDER BY f.sort`,
  [channel.id],
);
console.log('\n── Resumo (Postgres) ──');
for (const s of summary) console.log(`  ${s.role.padEnd(8)} ${(s.name || '').padEnd(22)} ${s.msgs} msgs`);
await pool.end();
