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

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { sale_id, organization_id } = await req.json()
    if (!sale_id || !organization_id) {
      return new Response(JSON.stringify({ error: 'sale_id e organization_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify user is member of org
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

    // Fetch organization credentials
    const { data: org } = await supabase
      .from('organizations')
      .select('invoicexpress_account_name, invoicexpress_api_key, integrations_enabled')
      .eq('id', organization_id)
      .single()

    // Check if integration is enabled
    const integrationsEnabled = (org?.integrations_enabled as Record<string, boolean> | null) || {}
    if (integrationsEnabled.invoicexpress === false) {
      return new Response(JSON.stringify({ error: 'Integração InvoiceXpress desativada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!org?.invoicexpress_account_name || !org?.invoicexpress_api_key) {
      return new Response(JSON.stringify({ error: 'Credenciais InvoiceXpress não configuradas' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch sale with client
    const { data: sale } = await supabase
      .from('sales')
      .select(`
        *,
        client:crm_clients(name, code, email, nif, phone, address_line1, address_line2, city, postal_code, country, company),
        lead:leads(name, email, phone)
      `)
      .eq('id', sale_id)
      .eq('organization_id', organization_id)
      .single()

    if (!sale) {
      return new Response(JSON.stringify({ error: 'Venda não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if already issued
    if (sale.invoicexpress_id) {
      return new Response(JSON.stringify({ error: 'Fatura já emitida para esta venda', invoice_reference: sale.invoice_reference }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check NIF
    const clientNif = sale.client?.nif
    if (!clientNif) {
      return new Response(JSON.stringify({ error: 'Cliente sem NIF. Adicione o NIF antes de emitir fatura.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch sale items
    const { data: saleItems } = await supabase
      .from('sale_items')
      .select('*')
      .eq('sale_id', sale_id)

    const items = (saleItems || []).map((item: any) => ({
      name: item.name,
      description: item.name,
      unit_price: Number(item.unit_price),
      quantity: Number(item.quantity),
      tax: {
        name: 'IVA23',
        value: 23,
      },
    }))

    // If no items, create a generic one
    if (items.length === 0) {
      items.push({
        name: 'Serviço',
        description: `Venda ${sale.code || sale_id}`,
        unit_price: Number(sale.total_value),
        quantity: 1,
        tax: {
          name: 'IVA23',
          value: 23,
        },
      })
    }

    // Format date as DD/MM/YYYY
    const saleDate = sale.sale_date || new Date().toISOString().split('T')[0]
    const [y, m, d] = saleDate.split('-')
    const formattedDate = `${d}/${m}/${y}`

    const clientName = sale.client?.company || sale.client?.name || sale.lead?.name || 'Cliente'
    const clientCode = sale.client?.code || clientNif

    // Build InvoiceXpress payload
    const invoicePayload = {
      invoice_receipt: {
        date: formattedDate,
        due_date: formattedDate,
        client: {
          name: clientName,
          code: clientCode,
          fiscal_id: clientNif,
          email: sale.client?.email || sale.lead?.email || '',
          address: sale.client?.address_line1 || '',
          city: sale.client?.city || '',
          postal_code: sale.client?.postal_code || '',
          country: sale.client?.country || 'Portugal',
        },
        items: items,
      },
    }

    const accountName = org.invoicexpress_account_name
    const apiKey = org.invoicexpress_api_key
    const baseUrl = `https://${accountName}.app.invoicexpress.com`

    // 1. Create draft
    const createRes = await fetch(`${baseUrl}/invoice_receipts.json?api_key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoicePayload),
    })

    if (!createRes.ok) {
      const errorText = await createRes.text()
      console.error('InvoiceXpress create error:', errorText)
      return new Response(JSON.stringify({ error: `Erro ao criar fatura no InvoiceXpress: ${createRes.status}`, details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const createData = await createRes.json()
    const invoiceId = createData.invoice_receipt?.id
    const sequentialNumber = createData.invoice_receipt?.sequential_number

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'InvoiceXpress não retornou ID do documento', details: createData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Finalize (communicate to AT)
    const finalizeRes = await fetch(`${baseUrl}/invoice_receipts/${invoiceId}/change-state.json?api_key=${apiKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice_receipt: {
          state: 'finalized',
        },
      }),
    })

    if (!finalizeRes.ok) {
      const errorText = await finalizeRes.text()
      console.error('InvoiceXpress finalize error:', errorText)
      // Still save the draft ID so we don't create duplicates
      await supabase
        .from('sales')
        .update({ invoicexpress_id: invoiceId, invoicexpress_type: 'invoice_receipts' })
        .eq('id', sale_id)

      return new Response(JSON.stringify({ 
        error: 'Fatura criada mas não finalizada. Finalize manualmente no InvoiceXpress.',
        invoicexpress_id: invoiceId,
        details: errorText,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Try to get the sequential number from finalize response
    let invoiceReference = sequentialNumber ? `FR ${sequentialNumber}` : `FR #${invoiceId}`
    try {
      const finalizeData = await finalizeRes.json()
      if (finalizeData.invoice_receipt?.sequential_number) {
        invoiceReference = `FR ${finalizeData.invoice_receipt.sequential_number}`
      }
    } catch {
      // Use default reference
    }

    // 3. Update sale with InvoiceXpress data
    await supabase
      .from('sales')
      .update({
        invoicexpress_id: invoiceId,
        invoicexpress_type: 'invoice_receipts',
        invoice_reference: invoiceReference,
      })
      .eq('id', sale_id)

    return new Response(JSON.stringify({
      success: true,
      invoicexpress_id: invoiceId,
      invoice_reference: invoiceReference,
    }), {
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
