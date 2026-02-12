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
      .select('keyinvoice_password, keyinvoice_api_url')
      .eq('id', organization_id)
      .single()

    if (!org?.keyinvoice_password) {
      return new Response(JSON.stringify({ error: 'Chave não configurada' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiUrl = org.keyinvoice_api_url || 'https://login.keyinvoice.com/API5.php'
    const sid = org.keyinvoice_password
    const results: Record<string, any> = { api_url: apiUrl, sid_length: sid.length }

    // Test A: Sid in JSON body with getCompanyInfo
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Sid: sid, method: 'getCompanyInfo' }),
      })
      const text = await res.text()
      results.test_a_body_json = text.substring(0, 1000)
    } catch (e) { results.test_a_error = String(e) }

    // Test B: form-urlencoded with Sid in body
    try {
      const params = new URLSearchParams({ Sid: sid, method: 'getCompanyInfo' })
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      const text = await res.text()
      results.test_b_form = text.substring(0, 1000)
    } catch (e) { results.test_b_error = String(e) }

    // Test C: GET request with query params
    try {
      const res = await fetch(`${apiUrl}?Sid=${encodeURIComponent(sid)}&method=getCompanyInfo`, {
        method: 'GET',
      })
      const text = await res.text()
      results.test_c_get = text.substring(0, 1000)
    } catch (e) { results.test_c_error = String(e) }

    // Test D: Sid in header + form body
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Sid': sid },
        body: JSON.stringify({ Sid: sid, method: 'getCompanyInfo' }),
      })
      const text = await res.text()
      results.test_d_both = text.substring(0, 1000)
    } catch (e) { results.test_d_error = String(e) }

    return new Response(JSON.stringify(results), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
