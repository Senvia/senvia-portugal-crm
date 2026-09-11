import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveConfig } from 'vite';

test('Vite isolates the CRM optimizer from the extension React installation', async () => {
  // Given: the real development configuration.
  const config = await resolveConfig({}, 'serve', 'development');

  // When: Vite resolves dependency scanning and package deduplication.
  const entries = config.optimizeDeps.entries;
  const dedupe = config.resolve.dedupe;

  // Then: only the CRM entry is scanned and React uses one root singleton.
  assert.deepEqual(entries, ['index.html']);
  assert.ok(dedupe.includes('react'));
  assert.ok(dedupe.includes('react-dom'));
});
