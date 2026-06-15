// Connectivity proof — connects to one IMAP account, lists folders (with their
// special-use roles) and the latest INBOX messages. NO passwords are printed.
// Run: npm run test:connect   (after filling TEST_IMAP_* in .env)
import 'dotenv/config';
import { ImapFlow } from 'imapflow';

const host = process.env.TEST_IMAP_HOST;
const port = Number(process.env.TEST_IMAP_PORT) || 993;
const secure = process.env.TEST_IMAP_SECURE !== 'false';
const user = process.env.TEST_IMAP_USER;
const pass = process.env.TEST_IMAP_PASSWORD;

if (!host || !user || !pass) {
  console.error('Faltam TEST_IMAP_HOST / TEST_IMAP_USER / TEST_IMAP_PASSWORD no .env');
  process.exit(1);
}

// Map IMAP \Special-Use flags to our folder roles.
function roleOf(box) {
  const u = (box.specialUse || '').toLowerCase();
  if (box.path.toUpperCase() === 'INBOX') return 'inbox';
  if (u.includes('sent')) return 'sent';
  if (u.includes('drafts')) return 'drafts';
  if (u.includes('junk')) return 'junk';
  if (u.includes('trash')) return 'trash';
  if (u.includes('archive')) return 'archive';
  return 'custom';
}

const client = new ImapFlow({
  host, port, secure,
  auth: { user, pass },
  logger: false, // keep credentials/protocol chatter out of stdout
});

try {
  await client.connect();
  console.log(`✓ Ligado a ${host} como ${user}\n`);

  console.log('── Pastas (mailboxes) ──');
  const boxes = await client.list();
  for (const b of boxes) {
    console.log(`  ${roleOf(b).padEnd(8)} ${b.path}${b.specialUse ? `  [${b.specialUse}]` : ''}`);
  }

  console.log('\n── Últimas mensagens na INBOX ──');
  const lock = await client.getMailboxLock('INBOX');
  try {
    const total = client.mailbox.exists;
    console.log(`  total na INBOX: ${total}`);
    const start = Math.max(1, total - 9);
    if (total > 0) {
      for await (const msg of client.fetch(`${start}:*`, { envelope: true, flags: true })) {
        const env = msg.envelope || {};
        const from = env.from?.[0]?.address || '(sem remetente)';
        const seen = msg.flags?.has('\\Seen') ? ' ' : '•';
        console.log(`  ${seen} #${msg.seq}  ${(from).padEnd(32).slice(0, 32)}  ${env.subject || '(sem assunto)'}`);
      }
    }
  } finally {
    lock.release();
  }

  console.log('\n✓ Teste concluído — a stack ImapFlow funciona contra a tua conta.');
} catch (err) {
  console.error('✗ Falha:', err.message);
  process.exitCode = 1;
} finally {
  await client.logout().catch(() => {});
}
