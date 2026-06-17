// Live IMAP connection manager — one per email caixa. Does an initial full sync,
// then holds the INBOX open in IDLE so new mail is synced into Postgres the
// instant it arrives (the frontend updates via Supabase Realtime). Reconnects
// with exponential backoff on drops.
import { ImapFlow } from 'imapflow';
import { imapConfig, getEmailCaixas, getEmailCaixa, smtpTransport } from './caixas.js';
import { syncCaixaFull, syncFolderMessages, backfillBodies } from './sync.js';
import { bodyToHtml } from './commands.js';
import { q } from './db.js';

const managers = new Map();
const log = (...a) => console.log(new Date().toISOString(), ...a);

const VACATION_COOLDOWN_MS = 4 * 24 * 60 * 60 * 1000; // max one auto-reply per sender / 4 days
// Senders we never auto-reply to (bounces, lists, robots) — replying would loop or annoy.
const AUTOMATED_RE = /(^|[._-])(no-?reply|noreply|do-?not-?reply|mailer-daemon|postmaster|bounce|bounces|notifications?|automated|daemon)(@|[._-]|$)/i;

function htmlToPlain(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .trim();
}

// Is "today" inside the vacation window? start required, end optional.
function withinWindow(vac) {
  if (!vac?.start_date) return true; // enabled with no start = always on
  const now = Date.now();
  const start = Date.parse(`${vac.start_date}T00:00:00`);
  if (!Number.isNaN(start) && now < start) return false;
  if (vac.end_date) {
    const end = Date.parse(`${vac.end_date}T23:59:59`);
    if (!Number.isNaN(end) && now > end) return false;
  }
  return true;
}

// only_contacts: does this email belong to a CRM lead or client of the org?
async function isCrmContact(orgId, email) {
  try {
    const rows = await q(
      `SELECT 1 WHERE EXISTS (SELECT 1 FROM crm_clients WHERE organization_id=$1 AND lower(email)=lower($2))
                  OR EXISTS (SELECT 1 FROM leads        WHERE organization_id=$1 AND lower(email)=lower($2)) LIMIT 1`,
      [orgId, email],
    );
    return rows.length > 0;
  } catch (e) {
    log(`[vacation] verificação de contacto CRM falhou: ${e.message}`);
    return false; // conservative: with only_contacts on, don't email non-verifiable senders
  }
}

class CaixaManager {
  constructor(caixa) {
    this.caixa = caixa;
    this.client = null;
    this.inboxFolder = null;
    this.stopped = false;
    this.syncing = false;
    this.reconnectMs = 5000;
    this.lastError = null;
  }

  async start() {
    this.stopped = false;
    await this.connect();
  }

  async connect() {
    if (this.stopped) return;
    const client = new ImapFlow(imapConfig(this.caixa));
    this.client = client;
    client.on('error', (err) => { this.lastError = err.message; });
    client.on('close', () => { if (!this.stopped) this.scheduleReconnect(); });

    try {
      await client.connect();
      log(`[${this.caixa.label}] IMAP ligado`);
      this.reconnectMs = 5000;
      this.lastError = null;

      const byPath = await syncCaixaFull(client, this.caixa, { perFolder: 40, bodyCap: 100 });
      this.inboxFolder = [...byPath.values()].find((f) => f.role === 'inbox') || null;

      if (this.inboxFolder) {
        await client.mailboxOpen(this.inboxFolder.path);
        // Only auto-reply to mail that arrives AFTER we go live — never to the
        // backlog of unread messages synced on connect (that would blast replies).
        this.connectedAt = Date.now();
        // ImapFlow keeps the open mailbox in IDLE; 'exists' fires on new mail.
        client.on('exists', () => this.onNewMail());
        log(`[${this.caixa.label}] a vigiar a Entrada (IDLE)`);
      }
    } catch (err) {
      this.lastError = err.message;
      log(`[${this.caixa.label}] falha de ligação: ${err.message}`);
      this.scheduleReconnect();
    }
  }

  async onNewMail() {
    if (!this.client || !this.inboxFolder || this.syncing) return;
    this.syncing = true;
    try {
      await syncFolderMessages(this.client, this.caixa, this.inboxFolder, 15);
      await backfillBodies(this.client, this.caixa, 15);
      // Refresh the Inbox unread/total counters from IMAP so the folder badge
      // updates on new mail (syncFolderMessages alone doesn't touch the counts).
      try {
        const st = await this.client.status(this.inboxFolder.path, { messages: true, unseen: true });
        await q(
          `UPDATE email_folders SET total_count=$2, unread_count=$3, updated_at=now() WHERE id=$1`,
          [this.inboxFolder.id, st.messages || 0, st.unseen || 0],
        );
      } catch (e) {
        log(`[${this.caixa.label}] aviso ao atualizar contadores: ${e.message}`);
      }
      log(`[${this.caixa.label}] novo email sincronizado`);
    } catch (err) {
      log(`[${this.caixa.label}] erro ao sincronizar novo email: ${err.message}`);
    } finally {
      this.syncing = false;
    }
    // Vacation auto-reply runs after sync, outside the sync guard.
    try { await this.maybeVacationReply(); }
    catch (err) { log(`[${this.caixa.label}] erro na resposta de férias: ${err.message}`); }
  }

  // Send the configured vacation auto-reply to senders of newly-arrived mail,
  // respecting the date window, the per-sender 4-day cooldown, the only-contacts
  // option, and skipping automated/own addresses.
  async maybeVacationReply() {
    // Read fresh config from the DB so enabling/disabling vacation takes effect
    // immediately, without waiting for the caixa to reconnect.
    const fresh = await getEmailCaixa(this.caixa.id);
    if (fresh) this.caixa.meta = fresh.meta;
    const vac = this.caixa.meta?.vacation_reply;
    if (!vac?.enabled || !withinWindow(vac)) return;
    if (!vac.subject || !vac.message) return;

    const since = new Date((this.connectedAt || Date.now()) - 2 * 60 * 1000).toISOString();
    const candidates = await q(
      `SELECT id, from_address, from_name, message_id, subject
         FROM email_messages
        WHERE channel_id=$1 AND folder_id=$2 AND seen=false
          AND from_address <> '' AND date > $3
        ORDER BY date DESC LIMIT 10`,
      [this.caixa.id, this.inboxFolder.id, since],
    );
    if (!candidates.length) return;

    const selfAddr = String(this.caixa.meta?.email_address || '').toLowerCase();
    for (const msg of candidates) {
      const to = String(msg.from_address || '').trim();
      const toLc = to.toLowerCase();
      if (!to || toLc === selfAddr) continue;
      if (AUTOMATED_RE.test(to)) continue;

      // Per-sender cooldown.
      const recent = await q(
        `SELECT 1 FROM email_vacation_log
          WHERE channel_id=$1 AND lower(to_address)=lower($2) AND sent_at > now() - interval '4 days' LIMIT 1`,
        [this.caixa.id, to],
      );
      if (recent.length) continue;

      if (vac.only_contacts && !(await isCrmContact(this.caixa.organization_id, to))) continue;

      const html = bodyToHtml(vac.message);
      const subject = /^re:/i.test(msg.subject || '') ? msg.subject : `${vac.subject}`;
      try {
        await smtpTransport(this.caixa).sendMail({
          from: { name: this.caixa.label || '', address: this.caixa.meta.email_address },
          to,
          subject,
          html,
          text: htmlToPlain(html),
          inReplyTo: msg.message_id ? `<${msg.message_id}>` : undefined,
          references: msg.message_id ? `<${msg.message_id}>` : undefined,
          // Mark as auto-generated so well-behaved servers don't auto-reply back.
          headers: { 'Auto-Submitted': 'auto-replied', 'X-Auto-Response-Suppress': 'All' },
        });
        await q(`INSERT INTO email_vacation_log (channel_id, to_address) VALUES ($1,$2)`, [this.caixa.id, to]);
        log(`[${this.caixa.label}] resposta de férias enviada a ${to}`);
      } catch (e) {
        log(`[${this.caixa.label}] falha ao enviar resposta de férias a ${to}: ${e.message}`);
      }
    }
  }

  // Full resync on demand (HTTP trigger).
  async resync() {
    if (!this.client?.usable) throw new Error('caixa desligada');
    if (this.syncing) return;
    this.syncing = true;
    try {
      await syncCaixaFull(this.client, this.caixa, { perFolder: 50, bodyCap: 200 });
    } finally {
      this.syncing = false;
    }
  }

  scheduleReconnect() {
    if (this.stopped) return;
    const ms = this.reconnectMs;
    this.reconnectMs = Math.min(this.reconnectMs * 2, 60_000);
    log(`[${this.caixa.label}] a reconectar em ${Math.round(ms / 1000)}s`);
    setTimeout(() => this.connect(), ms);
  }

  status() {
    return { id: this.caixa.id, label: this.caixa.label, connected: !!this.client?.usable, lastError: this.lastError };
  }

  async stop() {
    this.stopped = true;
    try { await this.client?.logout(); } catch { /* ignore */ }
  }
}

// Start a live manager for every email caixa, then poll every 60 s for new/removed ones.
export async function startAll() {
  const caixas = await getEmailCaixas();
  for (const caixa of caixas) {
    const m = new CaixaManager(caixa);
    managers.set(caixa.id, m);
    m.start().catch((e) => log(`[${caixa.label}] start falhou: ${e.message}`));
  }
  // Hot-reload: detect new channels added after gateway startup without restarting.
  setInterval(async () => {
    try {
      const added = await refreshChannels();
      if (added > 0) log(`hot-reload: ${added} nova(s) caixa(s) adicionada(s)`);
    } catch (e) {
      log('hot-reload erro:', e.message);
    }
  }, 60_000);
  return caixas.length;
}

// Detect channels added/removed since startup; start/stop their managers.
export async function refreshChannels() {
  const caixas = await getEmailCaixas();
  const known = new Set(managers.keys());
  let added = 0;
  for (const caixa of caixas) {
    if (!managers.has(caixa.id)) {
      log(`[${caixa.label}] nova caixa detectada, a ligar...`);
      const m = new CaixaManager(caixa);
      managers.set(caixa.id, m);
      m.start().catch((e) => log(`[${caixa.label}] start falhou: ${e.message}`));
      added++;
    }
    known.delete(caixa.id);
  }
  // Stop managers for channels that were removed from the DB.
  for (const removedId of known) {
    const m = managers.get(removedId);
    if (m) {
      log(`[${m.caixa.label}] caixa removida, a desligar...`);
      await m.stop();
      managers.delete(removedId);
    }
  }
  return added;
}

export function getManager(channelId) { return managers.get(channelId); }
export function managerStatus() { return [...managers.values()].map((m) => m.status()); }
export async function stopAll() { for (const m of managers.values()) await m.stop(); }
