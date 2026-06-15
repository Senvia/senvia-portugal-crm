// One-shot sync proof: syncs folders + the INBOX's recent messages of the first
// email caixa into Postgres, then prints what landed. Uses TEST_IMAP_* creds.
// Run: $env:DATABASE_URL="..."; npm run sync:test
import 'dotenv/config';
import { ImapFlow } from 'imapflow';
import { q, pool } from './db.js';
import { syncFolders, syncFolderMessages } from './sync.js';

const host = process.env.TEST_IMAP_HOST;
const port = Number(process.env.TEST_IMAP_PORT) || 993;
const secure = process.env.TEST_IMAP_SECURE !== 'false';
const user = process.env.TEST_IMAP_USER;
const pass = process.env.TEST_IMAP_PASSWORD;

const channels = await q(
  `SELECT id, organization_id, label FROM messaging_channels
   WHERE channel_type='email' ORDER BY created_at LIMIT 1`,
);
if (!channels.length) { console.error('Nenhuma caixa de email em messaging_channels'); process.exit(1); }
const channel = channels[0];
console.log(`Caixa: ${channel.label} (${channel.id})\n`);

const client = new ImapFlow({ host, port, secure, auth: { user, pass }, logger: false });
await client.connect();
console.log('✓ IMAP ligado\n');

console.log('── A sincronizar pastas ──');
const byPath = await syncFolders(client, channel);
for (const f of [...byPath.values()].sort((a, b) => a.role.localeCompare(b.role))) {
  console.log(`  ${f.role.padEnd(8)} ${f.path}`);
}

const inbox = [...byPath.values()].find((f) => f.role === 'inbox');
if (inbox) {
  console.log(`\n── A sincronizar mensagens da Entrada (${inbox.path}) ──`);
  const n = await syncFolderMessages(client, channel, inbox, 50);
  console.log(`  ${n} mensagens gravadas/atualizadas`);
}

await client.logout().catch(() => {});

// Verify what's in Postgres now
const [fc] = await q(`SELECT count(*)::int n FROM email_folders WHERE channel_id=$1`, [channel.id]);
const [mc] = await q(`SELECT count(*)::int n FROM email_messages WHERE channel_id=$1`, [channel.id]);
const recent = await q(
  `SELECT from_address, subject, seen, has_attachments, date
   FROM email_messages WHERE channel_id=$1 ORDER BY date DESC LIMIT 8`, [channel.id],
);
console.log(`\n✓ Postgres: ${fc.n} pastas, ${mc.n} mensagens`);
console.log('\nÚltimas no Postgres:');
for (const m of recent) {
  console.log(`  ${m.seen ? ' ' : '•'} ${m.has_attachments ? '📎' : '  '} ${(m.from_address || '').padEnd(30).slice(0, 30)} ${m.subject}`);
}
await pool.end();
