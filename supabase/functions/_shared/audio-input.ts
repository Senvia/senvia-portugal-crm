import { z } from 'npm:zod@3.25.76';

const audioInput = z.object({
  organization_id: z.string().uuid(),
  message_id: z.string().uuid(),
  media_id: z.string().regex(/^\d{1,64}$/),
}).strict();

export function parseAudioInput(value: unknown) {
  return audioInput.safeParse(value);
}

export async function readAudioBody(response: Response, maxBytes: number): Promise<Blob> {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw new RangeError('Audio size limit exceeded');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new RangeError('Empty audio');
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new RangeError('Audio size limit exceeded');
      }
      chunks.push(new Uint8Array(value));
    }
  } finally {
    reader.releaseLock();
  }
  if (total === 0) throw new RangeError('Empty audio');
  return new Blob(chunks, { type: response.headers.get('content-type') ?? 'application/octet-stream' });
}
