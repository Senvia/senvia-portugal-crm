// Command processor: polls email_commands and executes each over IMAP/SMTP, then
// updates the email tables. Lets the CRM drive actions/sending without the gateway
// being publicly reachable (it only needs the DB it already talks to).
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { simpleParser } from 'mailparser';
import { getEmailCaixa, smtpTransport } from './caixas.js';
import { getManager } from './idle.js';
import { syncFolderMessages, syncOlderMessages, syncUnreadMessages, backfillBodies } from './sync.js';
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

// Render a stored signature/message body to HTML. Plain text → escaped + <br>;
// content that already looks like HTML is used as-is.
export function bodyToHtml(raw) {
  const s = String(raw || '');
  if (!s.trim()) return '';
  if (/<(br|p|div|b|i|u|ol|ul|li|a|strong|em|span|table|img|h[1-6])\b/i.test(s)) return s;
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
}

function htmlToPlain(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .trim();
}

// Append the caixa's default signature to an outgoing message. Picks the "reply"
// default when the message is a reply (has inReplyTo), else the "new" default.
function applySignature(caixa, p) {
  const m = caixa.meta || {};
  const sigs = Array.isArray(m.signatures) ? m.signatures : [];
  if (!sigs.length) return p;
  // The composer now shows the signature INLINE while writing (senvia-signature
  // marker div) so the user sees it before sending, instead of it being a
  // server-side surprise appended after the quoted text. Skip re-adding it here
  // when it's already in the body — otherwise every send would carry two copies.
  if (p.html && p.html.includes('senvia-signature')) return p;
  const id = p.inReplyTo ? m.signature_default_reply : m.signature_default_new;
  const sig = id ? sigs.find((s) => s.id === id) : null;
  if (!sig || !String(sig.html || '').trim()) return p;
  const sigHtml = bodyToHtml(sig.html);
  const block = `<br><br><div class="senvia-signature">--<br>${sigHtml}</div>`;
  const out = { ...p };
  if (p.html) out.html = `${p.html}${block}`;
  else if (p.text != null) out.text = `${p.text}\n\n--\n${htmlToPlain(sigHtml)}`;
  else out.html = block;
  return out;
}

// Download one attachment's bytes from IMAP and cache them (base64) in the DB,
// so the browser can download it. Re-parses the message source via mailparser
// (reliable across providers).
async function fetchAttachment(client, attachmentId) {
  const [att] = await q(
    `SELECT a.id, a.filename, a.content_id, m.uid, f.path
       FROM email_attachments a
       JOIN email_messages m ON m.id = a.message_id
       JOIN email_folders f ON f.id = m.folder_id
      WHERE a.id=$1`, [attachmentId],
  );
  if (!att) throw new Error('anexo inexistente');
  const lock = await client.getMailboxLock(att.path);
  let parsed;
  try {
    const fetched = await client.fetchOne(String(att.uid), { source: true }, { uid: true });
    if (!fetched?.source) throw new Error('mensagem sem fonte');
    parsed = await simpleParser(fetched.source);
  } finally { lock.release(); }
  const list = parsed.attachments || [];
  const match = list.find((a) => (att.content_id && a.cid === att.content_id) || a.filename === att.filename)
    || list.find((a) => !!a.content);
  if (!match?.content) throw new Error('anexo não encontrado na mensagem');
  await q(`UPDATE email_attachments SET data_b64=$2 WHERE id=$1`, [att.id, match.content.toString('base64')]);
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
    attachments: Array.isArray(p.attachments) && p.attachments.length
      ? p.attachments.map((a) => ({ filename: a.filename, content: Buffer.from(a.b64 || '', 'base64'), contentType: a.contentType || undefined }))
      : undefined,
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
    case 'mark_folder_read': {
      const target = await folderById(p.folderId);
      if (!target) throw new Error('pasta inexistente');
      const lock = await client.getMailboxLock(target.path);
      try {
        // One IMAP op: add \Seen to every UNSEEN message in the folder.
        const unseen = await client.search({ seen: false }, { uid: true });
        if (unseen.length) await client.messageFlagsAdd(unseen, ['\\Seen'], { uid: true });
      } finally { lock.release(); }
      await q(`UPDATE email_messages SET seen=true, updated_at=now() WHERE folder_id=$1 AND seen=false`, [target.id]);
      return updateCounts(client, target.id);
    }
    case 'load_older': {
      const target = await folderById(p.folderId);
      if (!target) throw new Error('pasta inexistente');
      const n = await syncOlderMessages(client, caixa, target, p.batch || 40);
      if (n) await backfillBodies(client, caixa, p.batch || 40, target.id);
      await updateCounts(client, target.id);
      log(`load_older: +${n} em ${target.path}`);
      return;
    }
    case 'sync_unread': {
      const target = await folderById(p.folderId);
      if (!target) throw new Error('pasta inexistente');
      const n = await syncUnreadMessages(client, caixa, target, 200);
      if (n) await backfillBodies(client, caixa, 80, target.id);
      await updateCounts(client, target.id);
      log(`sync_unread: +${n} em ${target.path}`);
      return;
    }
    case 'fetch_attachment': return fetchAttachment(client, p.attachmentId);
    case 'send': return sendMail(caixa, applySignature(caixa, p));
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
