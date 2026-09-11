import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { fileURLToPath } from 'node:url';

async function commands(query, client, fetchMessageBody = async () => { throw new Error('unexpected body fetch'); }) {
  const code = (await readFile(new URL('./commands.js', import.meta.url), 'utf8'))
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  const box = vm.createContext({ q: query, console, Buffer, MailComposer,
    smtpTransport: async () => ({ sendMail() { throw new Error('unexpected send'); } }),
    getEmailCaixa: async () => ({ id: 'channel-a', organization_id: 'org-a', meta: { email_address: 'fixture@example.test' } }),
    getManager: () => ({ client }), fetchMessageBody });
  vm.runInContext(code, box);
  return box.execute;
}

const cmd = { channel_id: 'channel-a', organization_id: 'org-a', created_by: 'actor',
  type: 'mark_read', payload: { messageId: 'message-b' } };
const guardedClient = { usable: true, getMailboxLock: async () => { throw new Error('unauthorized IMAP operation reached'); } };

test('MIME composer rejects filesystem-backed HTML before sending', async () => {
  const execute = await commands(async () => [{ allowed: true }], guardedClient);
  await assert.rejects(execute({ ...cmd, type: 'send', payload: {
    to: ['fixture@example.test'], html: { path: fileURLToPath(import.meta.url) },
  } }), /File access rejected/i);
});

test('denies a command whose creator is missing before IMAP', async () => {
  const execute = await commands(async () => [{ allowed: true }], guardedClient);
  await assert.rejects(execute({ ...cmd, created_by: null }), /autoriz/);
});

test('denies a revoked actor before IMAP', async () => {
  const execute = await commands(async () => [{ allowed: false }], guardedClient);
  await assert.rejects(execute(cmd), /autoriz/);
});

test('denies a mismatched command organization before IMAP', async () => {
  const execute = await commands(async () => [{ allowed: true }], guardedClient);
  await assert.rejects(execute({ ...cmd, organization_id: 'org-b' }), /autoriz/);
});

test('foreign message is rejected by the scoped lookup before mailbox access', async () => {
  let accessed = false;
  const execute = await commands(async (sql, params) => {
    if (sql.includes('organization_members')) return [{ allowed: true }];
    if (sql.includes('FROM email_messages')) {
      return params?.includes('channel-a') && params?.includes('org-a') ? [] :
        [{ id: 'message-b', uid: 1, channel_id: 'channel-b', folder_id: 'folder-b', path: 'INBOX' }];
    }
    return [];
  }, { usable: true, getMailboxLock: async () => { accessed = true; throw new Error('foreign mailbox accessed'); } });
  await assert.rejects(execute(cmd), /inexistente/);
  assert.equal(accessed, false);
});

for (const type of ['move', 'mark_folder_read', 'load_older', 'sync_unread', 'fetch_attachment']) {
  test(`${type} rejects a foreign folder or attachment before IMAP`, async () => {
    const execute = await commands(async (sql, params) => {
      if (sql.includes('organization_members')) return [{ allowed: true }];
      if (sql.includes('FROM email_messages')) return [{ id: 'own-message', path: 'INBOX' }];
      return params?.includes('channel-a') && params?.includes('org-a') ? [] : [{ id: 'foreign', path: 'INBOX' }];
    }, guardedClient);
    await assert.rejects(execute({ ...cmd, type, payload: {
      messageId: 'own-message', targetFolderId: 'foreign', folderId: 'foreign', attachmentId: 'foreign',
    } }), /inexistente/);
  });
}

test('an authorized same-channel mark-read reaches IMAP and the scoped database update', async () => {
  const changes = [];
  const execute = await commands(async (sql, params) => {
    if (sql.includes('organization_members')) return [{ allowed: true }];
    if (sql.includes('FROM email_messages')) return [{ id: 'message-a', uid: 42, folder_id: 'folder-a', path: 'INBOX' }];
    if (sql.startsWith('UPDATE email_messages')) changes.push(params);
    return [];
  }, { usable: true, getMailboxLock: async () => ({ release() {} }),
    messageFlagsAdd: async (uid, flags) => { assert.equal(uid, '42'); assert.deepEqual(Array.from(flags), ['\\Seen']); } });
  await execute({ ...cmd, payload: { messageId: 'message-a' } });
  assert.deepEqual(Array.from(changes[0]), ['message-a', true, 'channel-a', 'org-a']);
});

test('an authorized same-channel body fetch reaches IMAP for the selected message', async () => {
  let fetched = null;
  const execute = await commands(async (sql) => {
    if (sql.includes('organization_members')) return [{ allowed: true }];
    if (sql.includes('FROM email_messages')) {
      return [{ id: 'message-a', uid: 42, folder_id: 'folder-a', path: 'INBOX' }];
    }
    return [];
  }, guardedClient, async (_client, caixa, message) => { fetched = { caixa, message }; });

  await execute({ ...cmd, type: 'fetch_body', payload: { messageId: 'message-a' } });
  assert.equal(fetched.caixa.id, 'channel-a');
  assert.equal(fetched.message.id, 'message-a');
  assert.equal(fetched.message.path, 'INBOX');
});
