// Per-caixa credentials. Production reads IMAP/SMTP settings from the email
// caixa's metadata in messaging_channels (one connection manager per caixa).
// Credentials never leave the server.
import nodemailer from 'nodemailer';
import { q } from './db.js';

// All email caixas of all orgs, with their connection metadata.
export async function getEmailCaixas() {
  const rows = await q(
    `SELECT id, organization_id, label, metadata
       FROM messaging_channels
      WHERE channel_type='email'`,
  );
  return rows
    .map((r) => ({ id: r.id, organization_id: r.organization_id, label: r.label, meta: r.metadata || {} }))
    .filter((c) => c.meta.imap_server && c.meta.imap_password);
}

export async function getEmailCaixa(channelId) {
  const [r] = await q(
    `SELECT id, organization_id, label, metadata
       FROM messaging_channels WHERE id=$1 AND channel_type='email'`,
    [channelId],
  );
  if (!r) return null;
  return { id: r.id, organization_id: r.organization_id, label: r.label, meta: r.metadata || {} };
}

// ImapFlow config for a caixa.
export function imapConfig(caixa) {
  const m = caixa.meta;
  return {
    host: m.imap_server,
    port: Number(m.imap_port) || 993,
    secure: m.imap_ssl !== false,
    auth: { user: (m.imap_login || m.email_address || '').trim(), pass: m.imap_password },
    logger: false,
    // Don't let a slow mailbox wedge the whole manager.
    socketTimeout: 60_000,
  };
}

// Nodemailer transport for a caixa (used by send, Phase 4). Port 465 = SSL/TLS.
export function smtpTransport(caixa) {
  const m = caixa.meta;
  const port = Number(m.smtp_port) || 587;
  return nodemailer.createTransport({
    host: m.smtp_server,
    port,
    secure: port === 465 || m.smtp_ssl === true,
    auth: { user: (m.smtp_login || m.email_address || '').trim(), pass: m.smtp_password },
  });
}
