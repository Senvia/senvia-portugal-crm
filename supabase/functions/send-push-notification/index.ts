import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VAPID keys
const VAPID_PUBLIC_KEY = 'BPheJr4xGbGEdqLeawCOx4bahUlERq9bOvn1dGznjrei6yRo4GfRYCJaj-WD_zVvMHekax5FQYUV-Uw89jyWFhA';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') || '';
const VAPID_SUBJECT = 'mailto:suporte@senvia.pt';

interface PushNotificationRequest {
  organization_id: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Base64URL encode/decode helpers
function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

// Helper to convert Uint8Array to ArrayBuffer safely
function toArrayBuffer(arr: Uint8Array): ArrayBuffer {
  return arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
}

// Create VAPID JWT token
async function createVapidJwt(audience: string, privateKeyBase64: string): Promise<string> {
  const header = { alg: 'ES256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: VAPID_SUBJECT,
  };

  const headerB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key (should be 32 bytes raw key)
  const privateKeyBytes = base64UrlDecode(privateKeyBase64);
  
  // Decode the public key to get x and y coordinates
  const publicKeyBytes = base64UrlDecode(VAPID_PUBLIC_KEY);
  // Public key is 65 bytes: 0x04 || x (32 bytes) || y (32 bytes)
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    d: base64UrlEncode(privateKeyBytes),
    x: base64UrlEncode(x),
    y: base64UrlEncode(y),
  };

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

// Generate encryption keys for Web Push
async function generateEncryptionKeys() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );
  
  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  return {
    keyPair,
    publicKey: new Uint8Array(publicKeyRaw),
    salt,
  };
}

// HKDF implementation
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const ikmBuffer = toArrayBuffer(ikm);
  const key = await crypto.subtle.importKey(
    'raw', 
    ikmBuffer, 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  );
  
  const saltBuffer = salt.length ? toArrayBuffer(salt) : new ArrayBuffer(32);
  const prk = new Uint8Array(await crypto.subtle.sign('HMAC', key, saltBuffer));
  
  const prkBuffer = toArrayBuffer(prk);
  const prkKey = await crypto.subtle.importKey(
    'raw', 
    prkBuffer, 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  );
  
  const infoWithCounter = new Uint8Array(info.length + 1);
  infoWithCounter.set(info);
  infoWithCounter[info.length] = 1;
  
  const infoBuffer = toArrayBuffer(infoWithCounter);
  const okm = new Uint8Array(await crypto.subtle.sign('HMAC', prkKey, infoBuffer));
  return okm.slice(0, length);
}

// Encrypt payload for Web Push
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<Uint8Array> {
  const { keyPair, publicKey: serverPublicKey, salt } = await generateEncryptionKeys();
  
  const clientPublicKeyBytes = base64UrlDecode(p256dhKey);
  const authSecretBytes = base64UrlDecode(authSecret);
  
  // Import client's public key
  const clientKeyBuffer = toArrayBuffer(clientPublicKeyBytes);
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    clientKeyBuffer,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
  
  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      keyPair.privateKey,
      256
    )
  );
  
  // Create info for key derivation
  const encoder = new TextEncoder();
  const keyInfoPrefix = encoder.encode('WebPush: info\0');
  const keyInfo = new Uint8Array(keyInfoPrefix.length + clientPublicKeyBytes.length + serverPublicKey.length);
  keyInfo.set(keyInfoPrefix);
  keyInfo.set(clientPublicKeyBytes, keyInfoPrefix.length);
  keyInfo.set(serverPublicKey, keyInfoPrefix.length + clientPublicKeyBytes.length);
  
  // Derive IKM
  const ikm = await hkdf(authSecretBytes, sharedSecret, keyInfo, 32);
  
  // Derive content encryption key and nonce
  const cekInfo = encoder.encode('Content-Encoding: aes128gcm\0');
  const nonceInfo = encoder.encode('Content-Encoding: nonce\0');
  
  const cek = await hkdf(salt, ikm, cekInfo, 16);
  const nonce = await hkdf(salt, ikm, nonceInfo, 12);
  
  // Add padding to payload
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // Delimiter
  
  // Encrypt
  const cekBuffer = toArrayBuffer(cek);
  const key = await crypto.subtle.importKey(
    'raw', 
    cekBuffer, 
    { name: 'AES-GCM' }, 
    false, 
    ['encrypt']
  );
  
  const nonceBuffer = toArrayBuffer(nonce);
  const paddedBuffer = toArrayBuffer(paddedPayload);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBuffer }, key, paddedBuffer)
  );
  
  // Build aes128gcm record
  const recordSize = 4096;
  const header = new Uint8Array(21 + serverPublicKey.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, recordSize, false);
  header[20] = serverPublicKey.length;
  header.set(serverPublicKey, 21);
  
  const result = new Uint8Array(header.length + encrypted.length);
  result.set(header);
  result.set(encrypted, header.length);
  
  return result;
}

// Send Web Push notification
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;
    
    // Create VAPID JWT
    const jwt = await createVapidJwt(audience, vapidPrivateKey);
    
    // Encrypt the payload
    const encrypted = await encryptPayload(payload, subscription.p256dh, subscription.auth);
    
    // Send the request
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Authorization': `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      },
      body: toArrayBuffer(encrypted),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Push failed: ${response.status} - ${errorText}`);
      return { success: false, statusCode: response.status, error: errorText };
    }

    return { success: true, statusCode: response.status };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error sending push:', message);
    return { success: false, error: message };
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

    if (!VAPID_PRIVATE_KEY) {
      console.warn('VAPID_PRIVATE_KEY not configured');
      return new Response(
        JSON.stringify({ success: true, message: 'Push notifications not configured', sent: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .eq('organization_id', body.organization_id);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return new Response(
        JSON.stringify({ error: 'Error fetching subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found');
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

    let successCount = 0;
    const expiredSubscriptions: string[] = [];

    for (const sub of subscriptions) {
      console.log(`Sending to: ${sub.endpoint.substring(0, 60)}...`);
      
      const result = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        payload,
        VAPID_PRIVATE_KEY
      );

      if (result.success) {
        successCount++;
        console.log('✓ Sent successfully');
      } else {
        console.error(`✗ Failed: ${result.error}`);
        if (result.statusCode === 404 || result.statusCode === 410) {
          expiredSubscriptions.push(sub.id);
        }
      }
    }

    if (expiredSubscriptions.length > 0) {
      console.log(`Removing ${expiredSubscriptions.length} expired subscriptions`);
      await supabase.from('push_subscriptions').delete().in('id', expiredSubscriptions);
    }

    console.log(`Result: ${successCount}/${subscriptions.length} sent`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, total: subscriptions.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Unexpected error:', message);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
