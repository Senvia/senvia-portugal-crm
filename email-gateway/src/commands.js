// Command processor: polls email_commands and executes each over IMAP/SMTP, then
// updates the email tables. Lets the CRM drive actions/sending without the gateway
// being publicly reachable (it only needs the DB it already talks to).
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { getEmailCaixa, smtpTransport } from './caixas.js';
import { getManager } from './idle.js';
import { syncFolderMessages } from './sync.js';
import { q } from './db.js';

const log = (...a) => console.log(new Date().toISOString(), ...a);

const CLAIM = `
  UPDATE email_commands SET status='processing'
  WHERE id = (SELECT id FROM email_commands WHERE status='pending' ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED)
  RETURNING *`;

async function getMsg(messageId) {
  const [m] = await q(
    `SELECT m.id, m.uid, m.folder_id, m.channel_id, f.path
       FROM email_messages m JOIN email_folders f ON f.id = m.folder_id
      WHERE m.id=$1`, [messageId],
  );
  return m;
}
async function folderByRole(channelId, role) {
  const [f] = await q(`SELECT id, path FROM email_folders WHERE channel_id=$1 AND role=$2 LIMIT 1`, [channelId, role]);
  return f;
}
async function folderById(id) {
  const [f] = await q(`SELECT id, path FROM email_folders WHERE id=$1`, [id]);
  return f;
}
async function updateCounts(client, folderId) {
  const [f] = await q(`SELECT id, path FROM email_folders WHERE id=$1`, [folderId]);
  if (!f) return;
  try {
    const st = await client.status(f.path, { messages: true, unseen: true });
    await q(`UPDATE email_folders SET total_count=$2, unread_count=$3, updated_at=now() WHERE id=$1`,
      [folderId, st.messages || 0, st.unseen || 0]);
  } catch { /* ignore */ }
}

async function setFlag(client, msg, flag, add, col, val) {
  const lock = await client.getMailboxLock(msg.path);
  try {
    if (add) await client.messageFlagsAdd(String(msg.uid), [flag], { uid: true });
    else await client.messageFlagsRemove(String(msg.uid), [flag], { uid: true });
  } finally { lock.release(); }
  await q(`UPDATE email_messages SET ${col}=$2, updated_at=now() WHERE id=$1`, [msg.id, val]);
  await updateCounts(client, msg.folder_id);
}

async function doMove(client, caixa, msg, target) {
  const lock = await client.getMailboxLock(msg.path);
  try { await client.messageMove(String(msg.uid), target.path, { uid: true }); }
  finally { lock.release(); }
  await q(`DELETE FROM email_messages WHERE id=$1`, [msg.id]);
  await syncFolderMessages(client, caixa, target, 15);
  await updateCounts(client, msg.folder_id);
  await updateCounts(client, target.id);
}

function toAddr(list) {
  if (!list) return undefined;
  const arr = Array.isArray(list) ? list : [list];
  return arr.map((a) => (typeof a === 'string' ? a : { name: a.name || '', address: a.address })).filter(Boolean);
}

async function sendMail(caixa, p) {
  const from = { name: caixa.label || '', address: caixa.meta.email_address };
  const opts = {
    from,
    to: toAddr(p.to),
    cc: toAddr(p.cc),
    bcc: toAddr(p.bcc),
    subject: p.subject || '',
    html: p.html || undefined,
    text: p.text || (p.html ? undefined : ''),
    inReplyTo: p.inReplyTo || undefined,
    references: p.references || undefined,
  };
  // Build raw MIME once (for the Sent copy), then send via SMTP.
  const raw = await new Promise((res, rej) =>
    new MailComposer(opts).compile().build((e, m) => (e ? rej(e) : res(m))));
  await smtpTransport(caixa).sendMail(opts);

  // Save a copy to the Sent folder (best-effort).
  const sent = await folderByRole(caixa.id, 'sent');
  const client = getManager(caixa.id)?.client;
  if (sent && client?.usable) {
    try {
      await client.append(sent.path, raw, ['\\Seen']);
      await syncFolderMessages(client, caixa, sent, 10);
      await updateCounts(client, sent.id);
    } catch (e) { log(`[${caixa.label}] aviso ao gravar em Enviados: ${e.message}`); }
  }
}

async function execute(cmd) {
  const caixa = await getEmailCaixa(cmd.channel_id);
  if (!caixa) throw new Error('caixa não encontrada');
  const client = getManager(cmd.channel_id)?.client;
  if (!client?.usable) throw new Error('caixa desligada');
  const p = cmd.payload || {};

  switch (cmd.type) {
    case 'mark_read': { const m = await getMsg(p.messageId); if (!m) throw new Error('mensagem inexistente'); return setFlag(client, m, '\\Seen', true, 'seen', true); }
    case 'mark_unread': { const m = await getMsg(p.messageId); if (!m) throw new Error('mensagem inexistente'); return setFlag(client, m, '\\Seen', false, 'seen', false); }
    case 'flag': { const m = await getMsg(p.messageId); if (!m) throw new Error('mensagem inexistente'); return setFlag(client, m, '\\Flagged', true, 'flagged', true); }
    case 'unflag': { const m = await getMsg(p.messageId); if (!m) throw new Error('mensagem inexistente'); return setFlag(client, m, '\\Flagged', false, 'flagged', false); }
    case 'delete': case 'spam': case 'archive': {
      const m = await getMsg(p.messageId); if (!m) throw new Error('mensagem inexistente');
      const role = cmd.type === 'delete' ? 'trash' : cmd.type === 'spam' ? 'junk' : 'archive';
      const target = await folderByRole(caixa.id, role);
      if (!target) throw new Error(`pasta "${role}" não existe nesta conta`);
      return doMove(client, caixa, m, target);
    }
    case 'move': {
      const m = await getMsg(p.messageId); if (!m) throw new Error('mensagem inexistente');
      const target = await folderById(p.targetFolderId);
      if (!target) throw new Error('pasta destino inexistente');
      return doMove(client, caixa, m, target);
    }
    case 'send': return sendMail(caixa, p);
    default: throw new Error(`tipo desconhecido: ${cmd.type}`);
  }
}

let running = false;
async function drain() {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const [cmd] = await q(CLAIM);
      if (!cmd) break;
      try {
        await execute(cmd);
        await q(`UPDATE email_commands SET status='done', processed_at=now() WHERE id=$1`, [cmd.id]);
        log(`comando ${cmd.type} ok`);
      } catch (e) {
        await q(`UPDATE email_commands SET status='error', error=$2, processed_at=now() WHERE id=$1`,
          [cmd.id, String(e.message).slice(0, 500)]);
        log(`comando ${cmd.type} ERRO: ${e.message}`);
      }
    }
  } finally { running = false; }
}

export function startCommandLoop() {
  setInterval(() => { drain().catch(() => {}); }, 2500);
  log('processador de comandos ativo (poll 2.5s)');
}
