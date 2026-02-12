import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const KEYINVOICE_API_BASE = 'https://api.cloudinvoice.net'

/**
 * KeyInvoice Auth - manages token acquisition and caching.
 * Can be called directly or used as a helper from other edge functions.
 * 
 * POST body: { organization_id: string }
 * Returns: { token: string }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { organization_id } = await req.json()
    if (!organization_id) {
      return new Response(JSON.stringify({ error: 'organization_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch org credentials
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('keyinvoice_username, keyinvoice_password, keyinvoice_company_code, keyinvoice_token, keyinvoice_token_expires_at')
      .eq('id', organization_id)
      .single()

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organização não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!org.keyinvoice_username || !org.keyinvoice_password) {
      return new Response(JSON.stringify({ error: 'Credenciais KeyInvoice não configuradas' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if cached token is still valid (we give a 1h buffer)
    if (org.keyinvoice_token && org.keyinvoice_token_expires_at) {
      const expiresAt = new Date(org.keyinvoice_token_expires_at)
      const now = new Date()
      if (expiresAt > now) {
        return new Response(JSON.stringify({ token: org.keyinvoice_token }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Obtain new token via login
    const loginPayload: Record<string, string> = {
      username: org.keyinvoice_username,
      password: org.keyinvoice_password,
    }
    if (org.keyinvoice_company_code) {
      loginPayload.company_code = org.keyinvoice_company_code
    }

    const loginRes = await fetch(`${KEYINVOICE_API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload),
    })

    if (!loginRes.ok) {
      const errorText = await loginRes.text()
      console.error('KeyInvoice login error:', loginRes.status, errorText)
      return new Response(JSON.stringify({ error: `Erro na autenticação KeyInvoice: ${loginRes.status}` }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const loginData = await loginRes.json()
    const token = loginData.key

    if (!token) {
      return new Response(JSON.stringify({ error: 'KeyInvoice não retornou token' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Cache token with 23h expiry (no documented expiry, we refresh daily)
    const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('organizations')
      .update({
        keyinvoice_token: token,
        keyinvoice_token_expires_at: expiresAt,
      })
      .eq('id', organization_id)

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('keyinvoice-auth error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
