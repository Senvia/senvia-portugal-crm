import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';

// The returned numeric host is used for the socket; the original name is only
// used for certificate verification/SNI, never a second DNS resolution.
export async function mailEndpoint(host, port, protocol, resolve = lookup) {
  const ports = protocol === 'imap' ? [143, 993] : [25, 465, 587];
  if (!ports.includes(port)) throw new Error('porta de email não autorizada');
  if (typeof host !== 'string' || !host || host.length > 253 || host !== host.trim()
      || /[\s/@\\%\[\]]/.test(host)) throw new Error('destino de email inválido');
  const literal = isIP(host);
  let timer;
  let addresses;
  try {
    addresses = literal ? [{ address: host }] : await Promise.race([
      resolve(host, { all: true, verbatim: true }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('destino DNS indisponível')), 5000); }),
    ]);
  } finally { clearTimeout(timer); }
  if (!addresses.length || addresses.some(({ address }) => {
    if (!isIP(address)) return true;
    const parsed = ipaddr.parse(address);
    // IPv4-mapped, transition, private, link-local, documentation and reserved
    // ranges are intentionally excluded as well as loopback.
    return parsed.range() !== 'unicast';
  })) throw new Error('destino de email não público');
  return { host: addresses[0].address, servername: host, port };
}
