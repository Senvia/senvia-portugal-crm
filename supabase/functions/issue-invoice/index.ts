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

    // Tax configuration (org-level fallback)
    const taxConfig = (org as any)?.tax_config || { tax_name: 'IVA23', tax_value: 23, tax_exemption_reason: null }
    const orgTaxValue = taxConfig.tax_value ?? 23
    const orgTaxName = orgTaxValue === 0 ? 'Isento' : (taxConfig.tax_name || 'IVA23')
    const orgTaxExemptionReason = taxConfig.tax_exemption_reason || null

    // Build item with per-item tax support
    const buildItem = (name: string, description: string, unitPrice: number, quantity: number, itemTaxValue?: number | null, itemTaxExemptionReason?: string | null) => {
      // Use product-level tax if defined, otherwise org-level
      const effectiveTaxValue = (itemTaxValue !== null && itemTaxValue !== undefined) ? itemTaxValue : orgTaxValue
      const effectiveTaxName = effectiveTaxValue === 0 ? 'Isento' : `IVA${effectiveTaxValue}`
      const effectiveExemptionReason = effectiveTaxValue === 0 
        ? (itemTaxExemptionReason || orgTaxExemptionReason) 
        : null

      const item: any = {
        name,
        description,
        unit_price: unitPrice,
        quantity,
        tax: { name: effectiveTaxName, value: effectiveTaxValue },
      }
      if (effectiveTaxValue === 0 && effectiveExemptionReason) {
        item.exemption_reason = effectiveExemptionReason
      }
      return item
    }

    // Determine the invoice amount
    let items: any[] = []
    // Track if any item is exempt for document-level tax_exemption
    let hasExemptItem = false
    let firstExemptionReason: string | null = null

    if (payment_id && payment_amount) {
      // Per-payment invoice: fetch sale_items to get product-level tax
      const { data: saleItemsForPayment } = await supabase
        .from('sale_items')
        .select('*, product:products(tax_value, tax_exemption_reason)')
        .eq('sale_id', sale_id)

      if (saleItemsForPayment && saleItemsForPayment.length > 0) {
        // Calculate total sale value from items to determine proportions
        const totalItemsValue = saleItemsForPayment.reduce((sum: number, si: any) => sum + (Number(si.unit_price) * Number(si.quantity)), 0)
        const paymentRatio = Number(payment_amount) / totalItemsValue

        for (const si of saleItemsForPayment) {
          const productTaxValue = si.product?.tax_value ?? null
          const productTaxExemptionReason = si.product?.tax_exemption_reason ?? null
          const effectiveTax = (productTaxValue !== null && productTaxValue !== undefined) ? productTaxValue : orgTaxValue
          if (effectiveTax === 0) {
            hasExemptItem = true
            if (!firstExemptionReason) {
              firstExemptionReason = productTaxExemptionReason || orgTaxExemptionReason
            }
          }
          const itemTotal = Number(si.unit_price) * Number(si.quantity)
          const proportionalValue = Math.round((itemTotal * paymentRatio) * 100) / 100
          items.push(buildItem(si.name, `Pagamento - ${si.name}`, proportionalValue, 1, productTaxValue, productTaxExemptionReason))
        }
      } else {
        // No sale_items: fallback to generic item with org tax
        items.push(buildItem('Serviço', `Pagamento - Venda ${sale.code || sale_id}`, Number(payment_amount), 1))
        if (orgTaxValue === 0) {
          hasExemptItem = true
          firstExemptionReason = orgTaxExemptionReason
        }
      }
    } else {
      // Legacy: full sale invoice using sale_items with product JOIN for per-item tax
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('*, product:products(tax_value, tax_exemption_reason)')
        .eq('sale_id', sale_id)

      items = (saleItems || []).map((item: any) => {
        const productTaxValue = item.product?.tax_value ?? null
        const productTaxExemptionReason = item.product?.tax_exemption_reason ?? null
        const effectiveTax = (productTaxValue !== null && productTaxValue !== undefined) ? productTaxValue : orgTaxValue
        if (effectiveTax === 0) {
          hasExemptItem = true
          if (!firstExemptionReason) {
            firstExemptionReason = productTaxExemptionReason || orgTaxExemptionReason
          }
        }
        return buildItem(item.name, item.name, Number(item.unit_price), Number(item.quantity), productTaxValue, productTaxExemptionReason)
      })

      if (items.length === 0) {
        items.push(buildItem('Serviço', `Venda ${sale.code || sale_id}`, Number(sale.total_value), 1))
        if (orgTaxValue === 0) {
          hasExemptItem = true
          firstExemptionReason = orgTaxExemptionReason
        }
      }
    }

    // Validate: if any exempt item exists, we need an exemption reason
    if (hasExemptItem && !firstExemptionReason) {
      return new Response(JSON.stringify({ 
        error: 'Configure o motivo de isenção de IVA no produto ou nas Definições → Integrações → InvoiceXpress antes de emitir faturas.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Date - must not be before the last invoice in the series (InvoiceXpress rule)
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    let dateSource = invoice_date || todayStr

    const accountName = org.invoicexpress_account_name
    const apiKey = org.invoicexpress_api_key
    const baseUrl = `https://${accountName}.app.invoicexpress.com`

    try {
      const listRes = await fetch(`${baseUrl}/${endpointName}.json?api_key=${apiKey}&page=1&per_page=1`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (listRes.ok) {
        const listData = await listRes.json()
        const docs = listData[endpointName] || listData.invoices || listData.invoice_receipts || []
        if (Array.isArray(docs) && docs.length > 0) {
          const lastDateStr = docs[0]?.date
          if (lastDateStr) {
            const [ld, lm, ly] = lastDateStr.split('/')
            const lastDateISO = `${ly}-${lm}-${ld}`
            if (dateSource < lastDateISO) {
              console.warn(`Date ${dateSource} is before last invoice date ${lastDateISO}. Adjusting.`)
              dateSource = lastDateISO
            }
          }
        }
      }
    } catch (e) {
      console.warn('Could not check last invoice date, proceeding with current date:', e)
    }

    const [y, m, d] = dateSource.split('-')
    const formattedDate = `${d}/${m}/${y}`

    const clientName = sale.client?.company || sale.client?.name || sale.lead?.name || 'Cliente'
    const clientCode = sale.client?.code || clientNif

    // Deterministic proprietary_uid for idempotency
    const proprietary_uid = payment_id ? `senvia-pay-${payment_id}` : `senvia-sale-${sale_id}`

    // Build InvoiceXpress payload
    const invoicePayload = {
      [docKey]: {
        date: formattedDate,
        due_date: formattedDate,
        ...(hasExemptItem && firstExemptionReason
          ? { tax_exemption: firstExemptionReason }
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
      proprietary_uid,
    }

    // 1. Create draft
    const createRes = await fetch(`${baseUrl}/${endpointName}.json?api_key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoicePayload),
    })

    // Handle 409 = duplicate (proprietary_uid already used)
    if (createRes.status === 409) {
      console.warn('InvoiceXpress 409: duplicate proprietary_uid, document already exists')
      // Try to find existing reference in our DB
      if (payment_id) {
        const { data: existingPay } = await supabase
          .from('sale_payments')
          .select('invoice_reference, invoice_file_url')
          .eq('id', payment_id)
          .single()
        if (existingPay?.invoice_reference) {
          return new Response(JSON.stringify({
            success: true,
            invoice_reference: existingPay.invoice_reference,
            ...(existingPay.invoice_file_url ? { pdf_url: existingPay.invoice_file_url } : {}),
            duplicate: true,
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }
      return new Response(JSON.stringify({ error: 'Fatura já foi criada anteriormente para este documento.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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
    const permalink = createData[docKey]?.permalink || null

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

    // 3. Generate PDF (async with polling)
    let pdfUrl: string | null = null
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const pdfRes = await fetch(`${baseUrl}/api/pdf/${invoiceId}.json?api_key=${apiKey}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        })
        if (pdfRes.status === 200) {
          const pdfData = await pdfRes.json()
          pdfUrl = pdfData?.output?.pdfUrl || null
          if (pdfUrl) break
        }
        if (pdfRes.status === 202 || !pdfUrl) {
          // PDF not ready yet, wait 2s
          await new Promise(r => setTimeout(r, 2000))
        }
      }
    } catch (e) {
      console.warn('PDF generation polling failed (non-blocking):', e)
    }

    // 4. Save reference + PDF URL (or permalink as fallback)
    const fileUrl = pdfUrl || permalink || null
    if (payment_id) {
      await supabase
        .from('sale_payments')
        .update({ 
          invoice_reference: invoiceReference,
          invoicexpress_id: invoiceId,
          ...(fileUrl ? { invoice_file_url: fileUrl } : {}),
        })
        .eq('id', payment_id)
    } else {
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
      ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
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
