import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOttoHistory, ottoSubmission, prospectSubmission } from './paid-client-input.ts';

test('Otto preserves the newest message after more than twenty turns', () => {
  const history = Array.from({ length: 100 }, (_, index) => ({ role: 'assistant' as const, content: `reply ${index}` }));
  const result = buildOttoHistory(history, 'new request');
  assert.equal(result.length, 40);
  assert.deepEqual(result.at(-1), { role: 'user', content: 'new request' });
  assert.equal(result[0].content, 'reply 61');
});

test('Otto limits UTF8 request size and oversized legacy replies and removes empty history', () => {
  const history = Array.from({ length: 40 }, () => ({ role: 'assistant' as const, content: '😀'.repeat(8000) }));
  history.push({ role: 'assistant', content: '' });
  const result = buildOttoHistory(history, 'new request');
  assert.ok(result.every(message => message.content.length > 0 && message.content.length <= 8000));
  const envelope = { organization_id: '00000000-0000-4000-8000-000000000001', messages: result, attachment_paths: Array(5).fill('a'.repeat(512)) };
  assert.ok(new TextEncoder().encode(JSON.stringify(envelope)).byteLength <= 65536);
  assert.equal(result.at(-1)?.content, 'new request');
});

test('Otto refuses invalid new input and excessive attachments before side effects', () => {
  assert.equal(ottoSubmission.safeParse({ input: '', attachmentCount: 0 }).success, false);
  assert.equal(ottoSubmission.safeParse({ input: 'a'.repeat(8001), attachmentCount: 0 }).success, false);
  assert.equal(ottoSubmission.safeParse({ input: 'hello', attachmentCount: 6 }).success, false);
  assert.equal(ottoSubmission.safeParse({ input: 'hello', attachmentCount: 5 }).success, true);
});

test('prospect bounds reject excessive terms URLs and paid limits', () => {
  const valid = { searchStrings: ['restaurant'], startUrls: [], location: 'Lisboa', maxResults: 50, maxQuestions: 10, maximumLeadsEnrichmentRecords: 50 };
  assert.equal(prospectSubmission.safeParse(valid).success, true);
  for (const changed of [{ maxResults: 51 }, { maxResults: 1.5 }, { maxQuestions: 11 }, { maximumLeadsEnrichmentRecords: 51 }, { searchStrings: ['a', 'b', 'c', 'd'] }, { startUrls: Array(4).fill('https://www.google.com/maps') }, { startUrls: ['https://evil.invalid'] }]) {
    assert.equal(prospectSubmission.safeParse({ ...valid, ...changed }).success, false);
  }
});
