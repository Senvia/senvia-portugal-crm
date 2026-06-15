// Live IMAP connection manager — one per email caixa. Does an initial full sync,
// then holds the INBOX open in IDLE so new mail is synced into Postgres the
// instant it arrives (the frontend updates via Supabase Realtime). Reconnects
// with exponential backoff on drops.
import { ImapFlow } from 'imapflow';
import { imapConfig, getEmailCaixas } from './caixas.js';
import { syncCaixaFull, syncFolderMessages, backfillBodies } from './sync.js';

const managers = new Map();
const log = (...a) => console.log(new Date().toISOString(), ...a);

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
      log(`[${this.caixa.label}] novo email sincronizado`);
    } catch (err) {
      log(`[${this.caixa.label}] erro ao sincronizar novo email: ${err.message}`);
    } finally {
      this.syncing = false;
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

// Start a live manager for every email caixa.
export async function startAll() {
  const caixas = await getEmailCaixas();
  for (const caixa of caixas) {
    const m = new CaixaManager(caixa);
    managers.set(caixa.id, m);
    m.start().catch((e) => log(`[${caixa.label}] start falhou: ${e.message}`));
  }
  return caixas.length;
}

export function getManager(channelId) { return managers.get(channelId); }
export function managerStatus() { return [...managers.values()].map((m) => m.status()); }
export async function stopAll() { for (const m of managers.values()) await m.stop(); }
