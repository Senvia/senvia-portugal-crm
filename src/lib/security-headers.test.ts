import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { z } from 'zod';

const config = z.object({ headers: z.array(z.object({ source: z.string(), headers: z.array(z.object({ key: z.string(), value: z.string() })) })) })
  .parse(JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')));

function headersFor(path: string): Map<string, string> {
  const headers = new Map<string, string>();
  for (const rule of config.headers) {
    if (new RegExp(`^${rule.source}$`).test(path)) {
      for (const header of rule.headers) headers.set(header.key, header.value);
    }
  }
  return headers;
}

test('CRM routes forbid framing and provide baseline security headers', () => {
  // Given / When / Then
  for (const path of ['/', '/dashboard', '/settings', '/clients', '/finance', '/faked']) {
    const headers = headersFor(path);
    assert.equal(headers.get('X-Frame-Options'), 'DENY');
    assert.ok(headers.get('Content-Security-Policy')?.includes("frame-ancestors 'none'"));
    assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assert.ok(headers.get('Content-Security-Policy-Report-Only'));
  }
});

test('public forms remain embeddable without inheriting CRM frame denial', () => {
  // Given / When / Then
  for (const path of ['/f/company', '/f/company/contact', '/c/company', '/c/company/contact']) {
    const headers = headersFor(path);
    assert.equal(headers.has('X-Frame-Options'), false);
    assert.ok(headers.get('Content-Security-Policy')?.includes('frame-ancestors https: http:'));
    assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  }
});
