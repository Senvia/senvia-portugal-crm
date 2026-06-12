// send-scheduled-messages — pg_cron invokes this every minute; it sends the due
// scheduled WhatsApp messages through each org's Evolution instance.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders, json, getConfig, evolutionFetch, instanceNameForOrg } from '../_shared/multicanal.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const cfg = getConfig();
    const admin = createClient(cfg.supabaseUrl, cfg.serviceKey);

    const { data: due, error } = await admin
      .from('scheduled_messages')
      .select('id, organization_id, phone, content')
      .eq('status', 'pending')
      .lte('send_at', new Date().toISOString())
      .order('send_at', { ascending: true })
      .limit(50);
    if (error) throw error;

    let sent = 0;
    let failed = 0;
    for (const msg of due ?? []) {
      // Claim the row first — a concurrent cron run must not double-send.
      const { data: claimed } = await admin
        .from('scheduled_messages')
        .update({ status: 'processing' })
        .eq('id', msg.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle();
      if (!claimed) continue;

      const instance = instanceNameForOrg(msg.organization_id);
      const number = String(msg.phone).replace(/\D/g, '');
      try {
        const res = await evolutionFetch(cfg, `/message/sendText/${instance}`, 'POST', {
          number,
          text: msg.content,
        });
        if (res.ok) {
          await admin
            .from('scheduled_messages')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', msg.id);
          sent++;
        } else {
          const errText = `${res.status} ${(await res.text()).slice(0, 280)}`;
          await admin.from('scheduled_messages').update({ status: 'failed', error: errText }).eq('id', msg.id);
          failed++;
        }
      } catch (e) {
        await admin
          .from('scheduled_messages')
          .update({ status: 'failed', error: String((e as Error).message).slice(0, 300) })
          .eq('id', msg.id);
        failed++;
      }
    }

    return json({ ok: true, due: due?.length ?? 0, sent, failed });
  } catch (err) {
    console.error('send-scheduled-messages error:', err);
    return json({ error: (err as Error).message }, 500);
  }
});
