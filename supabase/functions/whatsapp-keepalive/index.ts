// whatsapp-keepalive — cron-triggered heartbeat that checks every WhatsApp
// Evolution instance and reconnects any that went offline.
// Runs on a schedule via pg_cron (see migration) — no HTTP endpoint needed.
//
// Evolution/WhatsApp Baileys WebSockets can drop silently (flap guard, network
// blip, instance restart). When that happens inbound messages stop arriving and
// the connection appears "offline" until someone manually reconnects. This
// function runs every 2 minutes, queries the DB for every WhatsApp channel
// that SHOULD be connected, pings Evolution, and reconnects dropped ones.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const EVO_URL = (Deno.env.get('EVOLUTION_API_URL') || '').replace(/\/$/, '');
const EVO_KEY = Deno.env.get('EVOLUTION_API_KEY') || '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

async function evolutionFetch(path: string, method = 'GET', body?: unknown): Promise<Response> {
  return fetch(`${EVO_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', apikey: EVO_KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function mapState(state: string | undefined): 'connected' | 'connecting' | 'disconnected' {
  if (state === 'open') return 'connected';
  if (state === 'connecting') return 'connecting';
  return 'disconnected';
}

Deno.serve(async () => {
  try {
    // Fetch all WhatsApp channels that were ever successfully connected.
    const { data: channels } = await admin
      .from('messaging_channels')
      .select('id, organization_id, evolution_instance, status')
      .eq('channel_type', 'whatsapp')
      .not('evolution_instance', 'is', null)
      .neq('evolution_instance', '');

    if (!channels || channels.length === 0) return new Response('no channels');

    const results: Array<{ id: string; status: string; action: string }> = [];

    for (const ch of channels) {
      try {
        const stateRes = await evolutionFetch(`/instance/connectionState/${ch.evolution_instance}`);
        let status: 'connected' | 'connecting' | 'disconnected';

        if (!stateRes.ok) {
          // Instance doesn't exist or Evolution is down — mark disconnected.
          status = 'disconnected';
        } else {
          const stateData = await stateRes.json();
          status = mapState(stateData?.instance?.state);
        }

        if (status === 'disconnected') {
          // Try to reconnect the instance.
          const connectRes = await evolutionFetch(`/instance/connect/${ch.evolution_instance}`, 'POST');
          if (connectRes.ok) {
            status = 'connecting';
            results.push({ id: ch.id, status, action: 'reconnecting' });
          } else {
            results.push({ id: ch.id, status, action: 'reconnect_failed' });
          }
        } else {
          results.push({ id: ch.id, status, action: status });
        }

        // Sync status to DB (only if it changed, to avoid write churn).
        if (status !== ch.status) {
          await admin.from('messaging_channels').update({ status }).eq('id', ch.id);
        }
      } catch (err) {
        console.error(`[whatsapp-keepalive] error checking ${ch.evolution_instance}:`, err);
        results.push({ id: ch.id, status: 'error', action: String(err) });
      }
    }

    console.log('[whatsapp-keepalive] results:', JSON.stringify(results));
    return new Response(JSON.stringify({ ok: true, checked: channels.length, results }));
  } catch (err) {
    console.error('[whatsapp-keepalive] fatal:', err);
    return new Response(String(err), { status: 500 });
  }
});
