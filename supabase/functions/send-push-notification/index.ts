import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID keys (public key must match frontend)
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';

interface PushNotificationRequest {
  organization_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Simple JWT creation for VAPID
async function createVapidJwt(audience: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: 'mailto:suporte@senvia.pt',
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  
  // Import private key
  const privateKeyRaw = Uint8Array.from(atob(VAPID_PRIVATE_KEY.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    'raw',
    privateKeyRaw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    key,
    data
  );
  
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string
): Promise<boolean> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    
    // For now, use a simple fetch with VAPID headers
    // In production, you'd want to use proper encryption
    const jwt = await createVapidJwt(audience);
    
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      },
      body: payload,
    });

    if (!response.ok) {
      console.error(`Push failed for endpoint ${subscription.endpoint}: ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error sending push:', error);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: PushNotificationRequest = await req.json();
    console.log('Push notification request:', body);

    if (!body.organization_id || !body.title || !body.body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if VAPID private key is configured
    if (!VAPID_PRIVATE_KEY) {
      console.warn('VAPID_PRIVATE_KEY not configured, skipping push notifications');
      return new Response(
        JSON.stringify({ success: true, message: 'Push notifications not configured', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all subscriptions for the organization
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('organization_id', body.organization_id);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return new Response(
        JSON.stringify({ error: 'Error fetching subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found for organization');
      return new Response(
        JSON.stringify({ success: true, message: 'No subscriptions found', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscriptions`);

    const payload = JSON.stringify({
      title: body.title,
      body: body.body,
      url: body.url || '/leads',
      tag: body.tag || 'lead-notification',
    });

    // Send to all subscriptions
    const results = await Promise.all(
      subscriptions.map(sub => sendWebPush(sub, payload))
    );

    const successCount = results.filter(Boolean).length;
    console.log(`Sent ${successCount}/${subscriptions.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: successCount, 
        total: subscriptions.length 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
