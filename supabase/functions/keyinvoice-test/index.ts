import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { organization_id } = await req.json()

    const { data: org } = await supabase
      .from('organizations')
      .select('keyinvoice_password, keyinvoice_api_url, keyinvoice_username, keyinvoice_company_code')
      .eq('id', organization_id)
      .single()

    if (!org?.keyinvoice_password) {
      return new Response(JSON.stringify({ error: 'Chave não configurada' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = org.keyinvoice_password
    const apiUrl = 'https://login.keyinvoice.com/API5.php'
    const results: Record<string, any> = { apiKey_length: apiKey.length, apiKey_preview: apiKey.substring(0, 8) + '...' }

    // Maybe API 5.0 still needs login first but with the API key as password?
    // Test 1: login method with API key as Sid
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'login', ApiKey: apiKey }),
      })
      const text = await res.text()
      results.test_login_apikey = text.substring(0, 500)
    } catch (e) { results.test_login_apikey_err = String(e) }

    // Test 2: Just send method with ApiKey field in body
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'getCompanyInfo', ApiKey: apiKey }),
      })
      const text = await res.text()
      results.test_apikey_body = text.substring(0, 500)
    } catch (e) { results.test_apikey_body_err = String(e) }

    // Test 3: Send with "Key" field
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'getCompanyInfo', Key: apiKey }),
      })
      const text = await res.text()
      results.test_key_body = text.substring(0, 500)
    } catch (e) { results.test_key_body_err = String(e) }

    // Test 4: "Token" field
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'getCompanyInfo', Token: apiKey }),
      })
      const text = await res.text()
      results.test_token_body = text.substring(0, 500)
    } catch (e) { results.test_token_body_err = String(e) }

    // Test 5: Authorization header
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({ method: 'getCompanyInfo' }),
      })
      const text = await res.text()
      results.test_bearer = text.substring(0, 500)
    } catch (e) { results.test_bearer_err = String(e) }

    return new Response(JSON.stringify(results), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
