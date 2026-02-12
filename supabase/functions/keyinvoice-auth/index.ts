import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * KeyInvoice Auth (API 5.0) - returns the API Key directly as Sid.
 * No login required - the key IS the authentication.
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

    // Fetch org API key (stored in keyinvoice_password field)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('keyinvoice_password')
      .eq('id', organization_id)
      .single()

    if (orgError || !org) {
      return new Response(JSON.stringify({ error: 'Organização não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!org.keyinvoice_password) {
      return new Response(JSON.stringify({ error: 'Chave da API KeyInvoice não configurada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // API 5.0: The key IS the Sid - no login needed
    return new Response(JSON.stringify({ token: org.keyinvoice_password }), {
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
