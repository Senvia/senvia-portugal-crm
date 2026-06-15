// Core sync: IMAP folders + message headers → Postgres (email_folders / email_messages).
// Body + attachments are fetched lazily (on open) in a later pass — this keeps the
// initial sync fast even on mailboxes with thousands of messages.
import { q } from './db.js';
import { folderRole, roleSort } from './imap-roles.js';

function addrs(list) {
  if (!Array.isArray(list)) return [];
  return list.map((a) => ({ name: a.name || '', address: a.address || '' }));
}

function stripBrackets(id) {
  return id ? String(id).replace(/^<|>$/g, '') : null;
}

// A message has attachments if any body part is disposition=attachment or carries a filename.
function hasAttachments(node) {
  if (!node) return false;
  if (node.disposition === 'attachment') return true;
  const fn = node.dispositionParameters?.filename || node.parameters?.name;
  if (fn && node.disposition !== 'inline') return true;
  if (Array.isArray(node.childNodes)) return node.childNodes.some(hasAttachments);
  return false;
}

// Upsert all mailboxes of a caixa into email_folders. Returns the folder rows
// (with their DB ids) keyed by IMAP path.
export async function syncFolders(client, channel) {
  const boxes = await client.list();
  const byPath = new Map();
  for (const box of boxes) {
    if (box.path === '[Gmail]') continue; // Gmail's non-selectable parent
    const role = folderRole(box);
    let status = { messages: 0, unseen: 0, uidValidity: null, uidNext: null };
    try {
      status = await client.status(box.path, { messages: true, unseen: true, uidValidity: true, uidNext: true });
    } catch { /* some parents aren't selectable */ }
    const rows = await q(
      `INSERT INTO email_folders
         (organization_id, channel_id, path, name, role, special_use, parent_path,
          unread_count, total_count, uidvalidity, uidnext, sort, last_synced_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, now(), now())
       ON CONFLICT (channel_id, path) DO UPDATE SET
         name=EXCLUDED.name, role=EXCLUDED.role, special_use=EXCLUDED.special_use,
         unread_count=EXCLUDED.unread_count, total_count=EXCLUDED.total_count,
         uidvalidity=EXCLUDED.uidvalidity, uidnext=EXCLUDED.uidnext,
         last_synced_at=now(), updated_at=now()
       RETURNING id, path, role`,
      [
        channel.organization_id, channel.id, box.path,
        box.name || box.path.split(/[/.]/).pop(), role, box.specialUse || null,
        box.parent?.length ? box.parent.join('/') : null,
        status.unseen || 0, status.messages || 0,
        status.uidValidity ? String(status.uidValidity) : null,
        status.uidNext ? String(status.uidNext) : null,
        roleSort(role),
      ],
    );
    byPath.set(box.path, rows[0]);
  }
  return byPath;
}

// Sync the most recent `limit` messages (headers only) of one folder into email_messages.
export async function syncFolderMessages(client, channel, folder, limit = 50) {
  const lock = await client.getMailboxLock(folder.path);
  let count = 0;
  try {
    const total = client.mailbox.exists;
    if (!total) return 0;
    const start = Math.max(1, total - limit + 1);
    for await (const msg of client.fetch(`${start}:*`, {
      uid: true, envelope: true, flags: true, size: true, bodyStructure: true, internalDate: true,
    })) {
      const env = msg.envelope || {};
      const from = env.from?.[0] || {};
      const refs = (env.inReplyTo ? [stripBrackets(env.inReplyTo)] : []);
      const messageId = stripBrackets(env.messageId);
      const threadId = refs[0] || stripBrackets(env.inReplyTo) || messageId;
      await q(
        `INSERT INTO email_messages
           (organization_id, channel_id, folder_id, uid, message_id, thread_id, in_reply_to,
            from_name, from_address, to_addresses, cc_addresses, bcc_addresses,
            subject, date, seen, flagged, answered, draft, has_attachments, size, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20, now())
         ON CONFLICT (channel_id, folder_id, uid) DO UPDATE SET
           seen=EXCLUDED.seen, flagged=EXCLUDED.flagged, answered=EXCLUDED.answered,
           draft=EXCLUDED.draft, updated_at=now()`,
        [
          channel.organization_id, channel.id, folder.id, Number(msg.uid),
          messageId, threadId, stripBrackets(env.inReplyTo),
          from.name || '', from.address || '',
          JSON.stringify(addrs(env.to)), JSON.stringify(addrs(env.cc)), JSON.stringify(addrs(env.bcc)),
          env.subject || '', env.date || msg.internalDate || null,
          msg.flags?.has('\\Seen') || false, msg.flags?.has('\\Flagged') || false,
          msg.flags?.has('\\Answered') || false, msg.flags?.has('\\Draft') || false,
          hasAttachments(msg.bodyStructure), msg.size || null,
        ],
      );
      count++;
    }
  } finally {
    lock.release();
  }
  return count;
}
