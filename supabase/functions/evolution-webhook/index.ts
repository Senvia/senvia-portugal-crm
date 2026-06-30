// evolution-webhook — receives incoming WhatsApp messages from Evolution API
// Stores all messages in inbox_messages and detects "SAIR" for opt-out
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY')!;
const admin = createClient(supabaseUrl, serviceKey);

function normalizePhone(raw: string): string {
  let cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (/^\d{9}$/.test(cleaned)) return '+351' + cleaned;
  if (/^\d{11}$/.test(cleaned)) return '+55' + cleaned;
  return cleaned;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null);

  try {
    const body = await req.json();

    // Evolution webhook payload structure varies by event type
    // Common fields: phone, text, key, from, data
    const phone = body.phone || body.from || body.sender || body.key?.phone;
    const text = body.text || body.message || body.body || '';
    const evolutionId = body.key?.id || body.id || body.messageId || '';

    if (!phone || !text) {
      return new Response('Missing phone or text', { status: 400 });
    }

    const normalized = normalizePhone(String(phone));

    // Find the org by phone number
    const { data: orgs } = await admin
      .from('organizations')
      .select('id, contact_phone')
      .or(`contact_phone.eq.${normalized},contact_phone.eq.${phone.replace(/\D/g, '')}`);

    const orgId = orgs?.[0]?.id || null;

    // Store the message
    if (orgId) {
      await admin.from('inbox_messages').insert({
        organization_id: orgId,
        phone: normalized,
        message: text,
        direction: 'inbound',
        evolution_message_id: evolutionId,
      });
    }

    // Detect "SAIR" and mark opt-out
    if (text.toLowerCase().includes('sair')) {
      if (orgId) {
        await admin
          .from('organizations')
          .update({ wa_nudge_optout: true })
          .eq('id', orgId);
      }
      console.log(`Opt-out: phone=${normalized}, org=${orgId}`);
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Error', { status: 500 });
  }
});