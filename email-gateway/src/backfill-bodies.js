// Eager body backfill: fetches HTML/text + attachments for INBOX messages that
// don't have a body yet, so the read-only UI can render real emails straight
// from Postgres (no live gateway needed for the demo). Lazy fetch comes later.
// Run: $env:DATABASE_URL="..."; node src/backfill-bodies.js
import 'dotenv/config';
import { ImapFlow } from 'imapflow';
import { q, pool } from './db.js';
import { fetchMessageBody } from './sync.js';

const host = process.env.TEST_IMAP_HOST;
const port = Number(process.env.TEST_IMAP_PORT) || 993;
const secure = process.env.TEST_IMAP_SECURE !== 'false';
const user = process.env.TEST_IMAP_USER;
const pass = process.env.TEST_IMAP_PASSWORD;
const LIMIT = Number(process.argv[2]) || 50;

const [channel] = await q(
  `SELECT id, organization_id, label FROM messaging_channels
   WHERE channel_type='email' ORDER BY created_at LIMIT 1`,
);
const pending = await q(
  `SELECT m.id, m.uid, m.subject, f.path
     FROM email_messages m JOIN email_folders f ON f.id = m.folder_id
    WHERE m.channel_id=$1 AND f.role='inbox' AND m.body_fetched=false
    ORDER BY m.date DESC LIMIT $2`,
  [channel.id, LIMIT],
);
console.log(`${pending.length} mensagens sem corpo — a buscar...`);

const client = new ImapFlow({ host, port, secure, auth: { user, pass }, logger: false });
await client.connect();

let done = 0;
for (const msg of pending) {
  try {
    await fetchMessageBody(client, channel, msg);
    done++;
    if (done % 10 === 0) console.log(`  ${done}/${pending.length}`);
  } catch (e) {
    console.warn(`  ✗ uid ${msg.uid}: ${e.message}`);
  }
}
console.log(`✓ ${done} corpos gravados`);

await client.logout().catch(() => {});
await pool.end();
