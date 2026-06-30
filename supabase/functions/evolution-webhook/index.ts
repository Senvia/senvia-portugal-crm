// evolution-webhook — handles incoming WhatsApp messages from Evolution API
// Detects "SAIR" responses and marks orgs as opt-out
import { serve } from 'https://deno.land/std@0.170.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_KEY')!;
const admin = createClient(supabaseUrl, serviceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null);

  try {
    const body = await req.json();
    const { phone, text } = body;

    if (!phone || !text) return new Response('Missing phone or text', { status: 400 });

    // Check if message contains "SAIR" (case insensitive)
    if (text.toLowerCase().includes('sair')) {
      // Find the org by phone number
      const { data: orgs } = await admin
        .from('organizations')
        .select('id, contact_phone')
        .or(`contact_phone.eq.${phone},contact_phone.eq.351${phone.replace(/\D/g, '')}`)
        .eq('wa_nudge_optout', false);

      for (const org of orgs || []) {
        await admin
          .from('organizations')
          .update({ wa_nudge_optout: true })
          .eq('id', org.id);
      }

      console.log(`Opt-out: phone=${phone}, orgs=${orgs?.length || 0}`);
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new Response('Error', { status: 500 });
  }
});