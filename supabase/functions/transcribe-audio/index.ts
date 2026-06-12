// transcribe-audio — downloads a WhatsApp audio attachment and transcribes it
// with Groq Whisper (free tier, very fast, excellent Portuguese support).
// Requires secret: GROQ_API_KEY
import { corsHeaders, json, getConfig, authOrgMember } from '../_shared/multicanal.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const cfg = getConfig();
  const body = await req.json().catch(() => ({}));
  const { organization_id, url } = body as { organization_id?: string; url?: string };

  const auth = await authOrgMember(req, cfg, organization_id ?? '');
  if ('error' in auth) return auth.error;

  if (!url) return json({ error: 'url em falta' }, 400);

  if (!url.startsWith('https://')) {
    return json({ error: 'URL inválido — apenas HTTPS permitido' }, 400);
  }

  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
  if (!GROQ_API_KEY) return json({ error: 'GROQ_API_KEY não configurada — adicionar nos secrets do Supabase' }, 500);

  const fileRes = await fetch(url).catch(() => null);
  if (!fileRes?.ok) return json({ error: `Falha ao descarregar o áudio (${fileRes?.status ?? 'network error'})` }, 502);

  const audioBlob = await fileRes.blob();

  const urlPath = new URL(url).pathname;
  const ext = urlPath.split('.').pop()?.toLowerCase() ?? 'ogg';
  const supportedExts = ['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'ogg', 'wav', 'webm', 'flac', 'opus'];
  const filename = `audio.${supportedExts.includes(ext) ? ext : 'ogg'}`;

  const form = new FormData();
  form.append('file', audioBlob, filename);
  form.append('model', 'whisper-large-v3-turbo');
  form.append('language', 'pt');
  form.append('response_format', 'json');

  const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
    body: form,
  });

  if (!groqRes.ok) {
    const err = await groqRes.text().catch(() => groqRes.statusText);
    console.error('Groq error:', groqRes.status, err);
    return json({ error: `Groq: ${err}` }, 502);
  }

  const { text } = await groqRes.json() as { text: string };
  return json({ text: text?.trim() ?? '' });
});
