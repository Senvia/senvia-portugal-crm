// Copies all Storage buckets + files from OLD to NEW using the service-role keys.
// pg_dump does NOT move the actual files, only DB rows — this fills that gap.
// Uploading via the API recreates the storage.objects rows automatically.
//
// Run from the repo root (so it finds node_modules):
//   node --env-file=migration/.env migration/scripts/storage-sync.mjs
// Requires: OLD_URL, OLD_SERVICE_KEY, NEW_URL, NEW_SERVICE_KEY in migration/.env
import { createClient } from '@supabase/supabase-js';

const { OLD_URL, OLD_SERVICE_KEY, NEW_URL, NEW_SERVICE_KEY } = process.env;
for (const [k, v] of Object.entries({ OLD_URL, OLD_SERVICE_KEY, NEW_URL, NEW_SERVICE_KEY })) {
  if (!v) { console.error(`Missing env var: ${k}`); process.exit(1); }
}

const opt = { auth: { persistSession: false } };
const OLD = createClient(OLD_URL, OLD_SERVICE_KEY, opt);
const NEW = createClient(NEW_URL, NEW_SERVICE_KEY, opt);

const PAGE = 100;

async function copyPrefix(bucket, prefix = '') {
  let offset = 0;
  for (;;) {
    const { data: items, error } = await OLD.storage.from(bucket)
      .list(prefix, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    if (!items.length) break;

    for (const it of items) {
      const path = prefix ? `${prefix}/${it.name}` : it.name;
      if (it.id === null) {            // folder
        await copyPrefix(bucket, path);
        continue;
      }
      const { data: blob, error: dErr } = await OLD.storage.from(bucket).download(path);
      if (dErr) { console.error('DOWNLOAD FAIL', bucket, path, dErr.message); continue; }
      const buf = Buffer.from(await blob.arrayBuffer());
      const { error: uErr } = await NEW.storage.from(bucket)
        .upload(path, buf, { contentType: it.metadata?.mimetype, upsert: true });
      if (uErr) console.error('UPLOAD FAIL', bucket, path, uErr.message);
      else console.log('copied', `${bucket}/${path}`);
    }

    offset += items.length;
    if (items.length < PAGE) break;
  }
}

const { data: buckets, error } = await OLD.storage.listBuckets();
if (error) { console.error('listBuckets failed:', error.message); process.exit(1); }

for (const b of buckets) {
  console.log(`\n=== bucket: ${b.id} (public=${b.public}) ===`);
  await NEW.storage.createBucket(b.id, {
    public: b.public,
    fileSizeLimit: b.file_size_limit ?? undefined,
    allowedMimeTypes: b.allowed_mime_types ?? undefined,
  }).catch(() => { /* already exists */ });
  await copyPrefix(b.id);
}
console.log('\nStorage sync complete.');
