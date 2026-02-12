import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DEFAULT_KEYINVOICE_API_URL = 'https://app.keyinvoice.com/API/'

/**
 * KeyInvoice Auth - manages token (Sid) acquisition and caching.
 * Uses the real KeyInvoice API: POST to base URL with method:"login" in body.
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
      .select('keyinvoice_username, keyinvoice_password, keyinvoice_company_code, keyinvoice_token, keyinvoice_token_expires_at, keyinvoice_api_url')
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

    // Check if cached Sid is still valid
    if (org.keyinvoice_token && org.keyinvoice_token_expires_at) {
      const expiresAt = new Date(org.keyinvoice_token_expires_at)
      if (expiresAt > new Date()) {
        return new Response(JSON.stringify({ token: org.keyinvoice_token }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const apiUrl = org.keyinvoice_api_url || DEFAULT_KEYINVOICE_API_URL

    // Obtain new Sid via login using the real KeyInvoice API
    const loginPayload: Record<string, string> = {
      method: 'login',
      username: org.keyinvoice_username,
      password: org.keyinvoice_password,
    }
    if (org.keyinvoice_company_code) {
      loginPayload.companyCode = org.keyinvoice_company_code
    }

    const loginRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginPayload),
    })

    if (!loginRes.ok) {
      const errorText = await loginRes.text()
      console.error('KeyInvoice login HTTP error:', loginRes.status, errorText)
      return new Response(JSON.stringify({ error: `Erro na autenticação KeyInvoice: ${loginRes.status}` }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const loginData = await loginRes.json()
    
    // Real API returns {Status:1,Data:{Sid:"..."}}
    if (loginData.Status !== 1 || !loginData.Data?.Sid) {
      const errorMsg = loginData.ErrorMessage || 'Login falhou'
      console.error('KeyInvoice login failed:', errorMsg)
      return new Response(JSON.stringify({ error: `KeyInvoice: ${errorMsg}` }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const sid = loginData.Data.Sid

    // Cache Sid with 23h expiry
    const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
    await supabase
      .from('organizations')
      .update({
        keyinvoice_token: sid,
        keyinvoice_token_expires_at: expiresAt,
      })
      .eq('id', organization_id)

    return new Response(JSON.stringify({ token: sid }), {
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
