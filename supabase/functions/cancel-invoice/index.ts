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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { payment_id, sale_id, organization_id, reason, invoicexpress_id, document_type } = await req.json()

    if (!organization_id || !reason || !invoicexpress_id || !document_type) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: organization_id, reason, invoicexpress_id, document_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!payment_id && !sale_id) {
      return new Response(JSON.stringify({ error: 'payment_id ou sale_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify membership
    const { data: membership } = await supabase
      .from('organization_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('organization_id', organization_id)
      .eq('is_active', true)
      .maybeSingle()

    if (!membership) {
      return new Response(JSON.stringify({ error: 'Sem acesso a esta organização' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch org credentials
    const { data: org } = await supabase
      .from('organizations')
      .select('invoicexpress_account_name, invoicexpress_api_key')
      .eq('id', organization_id)
      .single()

    if (!org?.invoicexpress_account_name || !org?.invoicexpress_api_key) {
      return new Response(JSON.stringify({ error: 'Credenciais InvoiceXpress não configuradas' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const endpointName = document_type === 'invoice' ? 'invoices' : 'invoice_receipts'
    const docKey = document_type === 'invoice' ? 'invoice' : 'invoice_receipt'
    const baseUrl = `https://${org.invoicexpress_account_name}.app.invoicexpress.com`

    // Cancel document on InvoiceXpress
    const cancelRes = await fetch(
      `${baseUrl}/${endpointName}/${invoicexpress_id}/change-state.json?api_key=${org.invoicexpress_api_key}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          [docKey]: {
            state: 'canceled',
            message: reason,
          },
        }),
      }
    )

    if (!cancelRes.ok) {
      const errorText = await cancelRes.text()
      console.error('InvoiceXpress cancel error:', cancelRes.status, errorText)
      return new Response(JSON.stringify({ 
        error: `Erro ao anular fatura no InvoiceXpress (${cancelRes.status})`,
        details: errorText,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Consume body
    try { await cancelRes.text() } catch {}

    // Clear references
    if (payment_id) {
      await supabase
        .from('sale_payments')
        .update({
          invoice_reference: null,
          invoice_file_url: null,
          invoicexpress_id: null,
        })
        .eq('id', payment_id)
    }
    
    if (sale_id) {
      await supabase
        .from('sales')
        .update({
          invoicexpress_id: null,
          invoicexpress_type: null,
          invoice_reference: null,
        })
        .eq('id', sale_id)
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
