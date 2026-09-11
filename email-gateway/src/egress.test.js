import test from 'node:test';
import assert from 'node:assert/strict';
import { mailEndpoint } from './egress.js';

process.env.DATABASE_URL = 'postgres://fixture:fixture@127.0.0.1:1/fixture';
const { imapConfig, smtpTransport } = await import('./caixas.js');
const mailbox = (host, port = 993) => ({ meta: {
  imap_server: host, imap_port: port, imap_password: 'fixture',
  smtp_server: host, smtp_port: port, smtp_password: 'fixture', email_address: 'fixture@example.test',
} });

for (const host of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '100.64.0.1', '192.168.1.1',
  '0.0.0.0', '224.0.0.1', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1', '2001:db8::1']) {
  test(`denies non-public IMAP destination ${host}`, async () => {
    await assert.rejects(async () => imapConfig(mailbox(host)), /destino/);
  });
}
test('denies non-mail ports before creating a connection', async () => {
  await assert.rejects(async () => imapConfig(mailbox('8.8.8.8', 443)), /porta/);
});
test('requires STARTTLS before IMAP credentials on port 143', async () => {
  const caixa = mailbox('8.8.8.8', 143);
  caixa.meta.imap_ssl = false;
  const config = await imapConfig(caixa);
  assert.equal(config.doSTARTTLS, true);
});
test('requires STARTTLS before SMTP credentials on port 587', async () => {
  const transport = await smtpTransport(mailbox('8.8.8.8', 587));
  assert.equal(transport.options.requireTLS, true);
});

test('pins the vetted numeric address and preserves hostname for certificate validation', async () => {
  let lookups = 0;
  const endpoint = await mailEndpoint('mail.example.test', 993, 'imap', async () => {
    lookups++;
    return [{ address: '8.8.8.8' }];
  });
  assert.deepEqual(endpoint, { host: '8.8.8.8', servername: 'mail.example.test', port: 993 });
  assert.equal(lookups, 1);
});

test('rejects mixed public and private DNS records', async () => {
  await assert.rejects(mailEndpoint('mail.example.test', 587, 'smtp', async () =>
    [{ address: '8.8.8.8' }, { address: '127.0.0.1' }]), /destino/);
});

test('rejects a private DNS answer on reconnect', async () => {
  let calls = 0;
  const resolver = async () => [{ address: ++calls === 1 ? '8.8.8.8' : '127.0.0.1' }];
  await mailEndpoint('mail.example.test', 993, 'imap', resolver);
  await assert.rejects(mailEndpoint('mail.example.test', 993, 'imap', resolver), /destino/);
});

test('accepts public IPv6 mail destinations', async () => {
  const config = await imapConfig(mailbox('2001:4860:4860::8888'));
  assert.equal(config.host, '2001:4860:4860::8888');
  assert.equal(config.secure, true);
  assert.equal(config.tls.rejectUnauthorized, true);
});
