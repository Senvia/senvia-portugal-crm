import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const COUNTRY_CODE_MAP: Record<string, string> = {
  PT: 'Portugal', ES: 'Espanha', FR: 'França', DE: 'Alemanha', IT: 'Itália',
  GB: 'Reino Unido', US: 'Estados Unidos', BR: 'Brasil', AO: 'Angola', MZ: 'Moçambique',
  CV: 'Cabo Verde', NL: 'Países Baixos', BE: 'Bélgica', CH: 'Suíça', AT: 'Áustria',
  IE: 'Irlanda', LU: 'Luxemburgo', PL: 'Polónia', SE: 'Suécia', DK: 'Dinamarca',
}

function mapCountryToInvoiceXpress(country?: string | null): string {
  if (!country) return 'Portugal'
  const upper = country.trim().toUpperCase()
  if (upper.length === 2 && COUNTRY_CODE_MAP[upper]) {
    return COUNTRY_CODE_MAP[upper]
  }
  return country
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

    const { sale_id, organization_id, document_type = 'invoice_receipt', invoice_date, payment_id, payment_amount } = await req.json()
    if (!sale_id || !organization_id) {
      return new Response(JSON.stringify({ error: 'sale_id e organization_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const docType = document_type === 'invoice' ? 'invoice' : 'invoice_receipt'
    const isInvoice = docType === 'invoice'
    const endpointName = isInvoice ? 'invoices' : 'invoice_receipts'
    const docKey = isInvoice ? 'invoice' : 'invoice_receipt'
    const refPrefix = isInvoice ? 'FT' : 'FR'

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
      .select('invoicexpress_account_name, invoicexpress_api_key, integrations_enabled, tax_config')
      .eq('id', organization_id)
      .single()

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

    // If payment_id provided, check if that payment already has an invoice
    if (payment_id) {
      const { data: existingPayment } = await supabase
        .from('sale_payments')
        .select('invoice_reference')
        .eq('id', payment_id)
        .single()

      if (existingPayment?.invoice_reference) {
        return new Response(JSON.stringify({ 
          error: 'Fatura já emitida para este pagamento', 
          invoice_reference: existingPayment.invoice_reference 
        }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
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

    // Only block if no payment_id and sale already has invoicexpress_id (legacy full-sale invoice)
    if (!payment_id && sale.invoicexpress_id) {
      return new Response(JSON.stringify({ error: 'Fatura já emitida para esta venda', invoice_reference: sale.invoice_reference }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clientNif = sale.client?.nif
    if (!clientNif) {
      return new Response(JSON.stringify({ error: 'Cliente sem NIF. Adicione o NIF antes de emitir fatura.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Tax configuration
    const taxConfig = (org as any)?.tax_config || { tax_name: 'IVA23', tax_value: 23, tax_exemption_reason: null }
    const taxName = taxConfig.tax_value === 0 ? 'Isento' : (taxConfig.tax_name || 'IVA23')
    const taxValue = taxConfig.tax_value ?? 23

    if (taxValue === 0 && !taxConfig.tax_exemption_reason) {
      return new Response(JSON.stringify({ 
        error: 'Configure o motivo de isenção de IVA nas Definições → Integrações → InvoiceXpress antes de emitir faturas.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const buildItem = (name: string, description: string, unitPrice: number, quantity: number) => {
      const item: any = {
        name,
        description,
        unit_price: unitPrice,
        quantity,
        tax: { name: taxName, value: taxValue },
      }
      if (taxValue === 0 && taxConfig.tax_exemption_reason) {
        item.exemption_reason = taxConfig.tax_exemption_reason
      }
      return item
    }

    // Determine the invoice amount
    let items: any[] = []

    if (payment_id && payment_amount) {
      // Per-payment invoice: use the specific payment amount
      items.push(buildItem('Serviço', `Pagamento - Venda ${sale.code || sale_id}`, Number(payment_amount), 1))
    } else {
      // Legacy: full sale invoice using sale_items
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('*')
        .eq('sale_id', sale_id)

      items = (saleItems || []).map((item: any) => 
        buildItem(item.name, item.name, Number(item.unit_price), Number(item.quantity))
      )

      if (items.length === 0) {
        items.push(buildItem('Serviço', `Venda ${sale.code || sale_id}`, Number(sale.total_value), 1))
      }
    }

    // Date
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const dateSource = invoice_date || todayStr
    const [y, m, d] = dateSource.split('-')
    const formattedDate = `${d}/${m}/${y}`

    const clientName = sale.client?.company || sale.client?.name || sale.lead?.name || 'Cliente'
    const clientCode = sale.client?.code || clientNif

    // Build InvoiceXpress payload
    const invoicePayload = {
      [docKey]: {
        date: formattedDate,
        due_date: formattedDate,
        ...(taxValue === 0 && taxConfig.tax_exemption_reason
          ? { tax_exemption: taxConfig.tax_exemption_reason }
          : {}),
        client: {
          name: clientName,
          code: clientCode,
          fiscal_id: clientNif,
          email: sale.client?.email || sale.lead?.email || '',
          address: sale.client?.address_line1 || '',
          city: sale.client?.city || '',
          postal_code: sale.client?.postal_code || '',
          country: mapCountryToInvoiceXpress(sale.client?.country),
        },
        items: items,
      },
    }

    const accountName = org.invoicexpress_account_name
    const apiKey = org.invoicexpress_api_key
    const baseUrl = `https://${accountName}.app.invoicexpress.com`

    // 1. Create draft
    const createRes = await fetch(`${baseUrl}/${endpointName}.json?api_key=${apiKey}`, {
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
    const invoiceId = createData[docKey]?.id
    const sequentialNumber = createData[docKey]?.sequential_number

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'InvoiceXpress não retornou ID do documento', details: createData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Finalize
    const finalizeRes = await fetch(`${baseUrl}/${endpointName}/${invoiceId}/change-state.json?api_key=${apiKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        [docKey]: { state: 'finalized' },
      }),
    })

    if (!finalizeRes.ok) {
      const errorText = await finalizeRes.text()
      console.error('InvoiceXpress finalize error:', errorText)

      return new Response(JSON.stringify({ 
        error: 'Fatura criada mas não finalizada. Finalize manualmente no InvoiceXpress.',
        invoicexpress_id: invoiceId,
        details: errorText,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let invoiceReference = sequentialNumber ? `${refPrefix} ${sequentialNumber}` : `${refPrefix} #${invoiceId}`
    try {
      const finalizeData = await finalizeRes.json()
      if (finalizeData[docKey]?.sequential_number) {
        invoiceReference = `${refPrefix} ${finalizeData[docKey].sequential_number}`
      }
    } catch {
      // Use default reference
    }

    // 3. Save reference
    if (payment_id) {
      // Per-payment: save on the payment record
      await supabase
        .from('sale_payments')
        .update({ invoice_reference: invoiceReference })
        .eq('id', payment_id)
    } else {
      // Legacy full-sale: save on the sale record
      await supabase
        .from('sales')
        .update({
          invoicexpress_id: invoiceId,
          invoicexpress_type: endpointName,
          invoice_reference: invoiceReference,
        })
        .eq('id', sale_id)
    }

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
