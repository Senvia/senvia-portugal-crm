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

const DEFAULT_KEYINVOICE_API_URL = 'https://login.keyinvoice.com/API5.php'

// API 5.0: The API key IS the Sid - no login needed
function getKeyInvoiceApiKey(org: any): string {
  if (!org.keyinvoice_password) {
    throw new Error('Chave da API KeyInvoice não configurada')
  }
  return org.keyinvoice_password
}

async function handleKeyInvoice(supabase: any, org: any, saleId: string, organizationId: string, observations: string | undefined, corsHeaders: Record<string, string>) {
  if (!org?.keyinvoice_password) {
    return new Response(JSON.stringify({ error: 'Chave da API KeyInvoice não configurada' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Fetch sale with client
  const { data: sale } = await supabase
    .from('sales')
    .select(`*, client:crm_clients(name, code, email, nif, phone, address_line1, city, postal_code, country, company), lead:leads(name, email, phone)`)
    .eq('id', saleId)
    .eq('organization_id', organizationId)
    .single()

  if (!sale) {
    return new Response(JSON.stringify({ error: 'Venda não encontrada' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (sale.invoicexpress_id) {
    return new Response(JSON.stringify({ error: 'Fatura já emitida para esta venda', invoice_reference: sale.invoice_reference }), {
      status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const clientNif = sale.client?.nif
  if (!clientNif) {
    return new Response(JSON.stringify({ error: 'Cliente sem NIF. Adicione o NIF antes de emitir fatura.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const sid = getKeyInvoiceApiKey(org)
  const apiUrl = org.keyinvoice_api_url || DEFAULT_KEYINVOICE_API_URL

  // Tax config
  const taxConfig = org?.tax_config || { tax_value: 23 }
  const orgTaxValue = taxConfig.tax_value ?? 23

  // Fetch sale items
  const { data: saleItems } = await supabase
    .from('sale_items')
    .select('*, product:products(tax_value, tax_exemption_reason)')
    .eq('sale_id', saleId)

  const clientName = sale.client?.company || sale.client?.name || sale.lead?.name || 'Cliente'
  const clientCode = sale.client?.code || clientNif

  // Build DocLines for KeyInvoice real API
  const docLines = (saleItems || []).map((item: any) => {
    const line: any = {
      IdProduct: item.name, // Use product name as identifier
      Qty: String(Number(item.quantity)),
      Price: String(Number(item.unit_price)),
    }
    return line
  })

  if (docLines.length === 0) {
    docLines.push({
      IdProduct: `Venda ${sale.code || saleId}`,
      Qty: '1',
      Price: String(Number(sale.total_value)),
    })
  }

  // 1. Create document using real KeyInvoice API: method:"insertDocument"
  // DocType 34 = Fatura-Recibo (FR)
  const insertPayload: Record<string, any> = {
    method: 'insertDocument',
    DocType: '34',
    IdClient: clientCode,
    DocLines: docLines,
  }
  if (observations) {
    insertPayload.Comments = observations
  }

  const createRes = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Sid': sid },
    body: JSON.stringify(insertPayload),
  })

  if (!createRes.ok) {
    const errorText = await createRes.text()
    console.error('KeyInvoice insertDocument HTTP error:', createRes.status, errorText)
    return new Response(JSON.stringify({ error: `Erro ao criar documento no KeyInvoice: ${createRes.status}`, details: errorText }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const createData = await createRes.json()
  
  // Real API returns {Status:1,Data:{DocType,DocSeries,DocNum,FullDocNumber}}
  if (createData.Status !== 1 || !createData.Data) {
    const errorMsg = createData.ErrorMessage || 'Erro ao criar documento'
    console.error('KeyInvoice insertDocument failed:', errorMsg)
    return new Response(JSON.stringify({ error: `KeyInvoice: ${errorMsg}` }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const docNum = createData.Data.DocNum
  const fullDocNumber = createData.Data.FullDocNumber || `FR ${docNum}`
  const docSeries = createData.Data.DocSeries

  // 2. Get PDF via method:"getDocumentPDF" (returns Base64)
  let storedPdfPath: string | null = null
  try {
    const pdfPayload: Record<string, string> = {
      method: 'getDocumentPDF',
      DocType: '34',
      DocNum: String(docNum),
    }
    if (docSeries) pdfPayload.DocSeries = String(docSeries)

    const pdfRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Sid': sid },
      body: JSON.stringify(pdfPayload),
    })

    if (pdfRes.ok) {
      const pdfData = await pdfRes.json()
      if (pdfData.Status === 1 && pdfData.Data) {
        // Data contains Base64 PDF
        const base64Pdf = pdfData.Data
        const binaryStr = atob(base64Pdf)
        const bytes = new Uint8Array(binaryStr.length)
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i)
        }

        const pdfFileName = `${organizationId}/${saleId}/FR-${docNum}.pdf`
        const { error: uploadError } = await supabase.storage
          .from('invoices')
          .upload(pdfFileName, bytes.buffer, { contentType: 'application/pdf', upsert: true })
        if (!uploadError) storedPdfPath = pdfFileName
      }
    }
  } catch (e) {
    console.warn('KeyInvoice PDF generation failed (non-blocking):', e)
  }

  // 3. Save reference
  await supabase
    .from('sales')
    .update({
      invoicexpress_id: docNum,
      invoicexpress_type: 'keyinvoice',
      invoice_reference: fullDocNumber,
      ...(storedPdfPath ? { invoice_pdf_url: storedPdfPath } : {}),
    })
    .eq('id', saleId)

  return new Response(JSON.stringify({
    success: true,
    invoicexpress_id: docNum,
    invoice_reference: fullDocNumber,
  }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
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

    const { sale_id, organization_id, observations } = await req.json()
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
      .select('invoicexpress_account_name, invoicexpress_api_key, integrations_enabled, tax_config, billing_provider, keyinvoice_password, keyinvoice_api_url')
      .eq('id', organization_id)
      .single()

    const billingProvider = (org as any)?.billing_provider || 'invoicexpress'
    const integrationsEnabled = (org?.integrations_enabled as Record<string, boolean> | null) || {}
    
    if (integrationsEnabled.invoicexpress === false) {
      return new Response(JSON.stringify({ error: 'Integração de faturação desativada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Route to KeyInvoice if selected
    if (billingProvider === 'keyinvoice') {
      return await handleKeyInvoice(supabase, org, sale_id, organization_id, observations, corsHeaders)
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

    // Check if invoice already exists for this sale
    if (sale.invoicexpress_id) {
      return new Response(JSON.stringify({ 
        error: 'Fatura já emitida para esta venda', 
        invoice_reference: sale.invoice_reference,
        invoicexpress_id: sale.invoicexpress_id,
      }), {
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
    const orgTaxExemptionReason = taxConfig.tax_exemption_reason || null

    // Build item with per-item tax support
    const buildItem = (name: string, description: string, unitPrice: number, quantity: number, itemTaxValue?: number | null, itemTaxExemptionReason?: string | null) => {
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

    // Always emit invoice for the full sale total using sale_items
    let items: any[] = []
    let hasExemptItem = false
    let firstExemptionReason: string | null = null

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

    // Validate exemption reason
    if (hasExemptItem && !firstExemptionReason) {
      return new Response(JSON.stringify({ 
        error: 'Configure o motivo de isenção de IVA no produto ou nas Definições → Integrações → InvoiceXpress antes de emitir faturas.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Date
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    let dateSource = todayStr

    const accountName = org.invoicexpress_account_name
    const apiKey = org.invoicexpress_api_key
    const baseUrl = `https://${accountName}.app.invoicexpress.com`

    // Check last invoice date for chronological order
    try {
      const listRes = await fetch(`${baseUrl}/invoices.json?api_key=${apiKey}&page=1&per_page=1`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (listRes.ok) {
        const listData = await listRes.json()
        const docs = listData.invoices || []
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
    const proprietary_uid = `senvia-sale-${sale_id}`

    // Build observations from payments if not provided by frontend
    let finalObservations = observations || ''
    if (!finalObservations) {
      const { data: salePayments } = await supabase
        .from('sale_payments')
        .select('amount, payment_date, status')
        .eq('sale_id', sale_id)
        .order('payment_date', { ascending: true })
      
      if (salePayments && salePayments.length > 1) {
        finalObservations = `Pagamento em ${salePayments.length} parcelas:\n` +
          salePayments.map((p: any, i: number) => {
            const d = new Date(p.payment_date)
            const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
            return `- ${i + 1}.ª parcela: ${Number(p.amount).toFixed(2)} EUR - ${dateStr}`
          }).join('\n')
      } else if (salePayments && salePayments.length === 1) {
        const p = salePayments[0]
        const d = new Date(p.payment_date)
        const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
        finalObservations = `Data de pagamento: ${dateStr}`
      }
    }

    // Build InvoiceXpress payload - always invoice type
    const invoicePayload = {
      invoice: {
        date: formattedDate,
        due_date: formattedDate,
        ...(finalObservations ? { observations: finalObservations } : {}),
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
    const createRes = await fetch(`${baseUrl}/invoices.json?api_key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoicePayload),
    })

    // Handle 409 = duplicate
    if (createRes.status === 409) {
      return new Response(JSON.stringify({ error: 'Fatura já foi criada anteriormente para esta venda.' }), {
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
    const invoiceId = createData.invoice?.id
    const sequentialNumber = createData.invoice?.sequential_number
    const permalink = createData.invoice?.permalink || null

    if (!invoiceId) {
      return new Response(JSON.stringify({ error: 'InvoiceXpress não retornou ID do documento', details: createData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Finalize
    const finalizeRes = await fetch(`${baseUrl}/invoices/${invoiceId}/change-state.json?api_key=${apiKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice: { state: 'finalized' },
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

    let invoiceReference = sequentialNumber ? `FT ${sequentialNumber}` : `FT #${invoiceId}`
    try {
      const finalizeData = await finalizeRes.json()
      if (finalizeData.invoice?.sequential_number) {
        invoiceReference = `FT ${finalizeData.invoice.sequential_number}`
      }
    } catch {
      // Use default reference
    }

    // 3. Generate PDF
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
          await new Promise(r => setTimeout(r, 2000))
        }
      }
    } catch (e) {
      console.warn('PDF generation polling failed (non-blocking):', e)
    }

    // Download and store PDF locally
    let storedPdfPath: string | null = null
    if (pdfUrl) {
      try {
        const pdfBinaryRes = await fetch(pdfUrl)
        if (pdfBinaryRes.ok) {
          const pdfBuffer = await pdfBinaryRes.arrayBuffer()
          const pdfFileName = `${organization_id}/${sale_id}/FT-${invoiceId}.pdf`
          const { error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(pdfFileName, pdfBuffer, { contentType: 'application/pdf', upsert: true })
          if (!uploadError) {
            storedPdfPath = pdfFileName
          } else {
            console.warn('PDF upload to storage failed:', uploadError)
          }
        }
      } catch (e) {
        console.warn('PDF download/upload failed (non-blocking):', e)
      }
    }

    // 4. QR Code polling
    let qrCodeUrl: string | null = null
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        const qrRes = await fetch(`${baseUrl}/api/qr_codes/${invoiceId}.json?api_key=${apiKey}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        })
        if (qrRes.status === 200) {
          const qrData = await qrRes.json()
          qrCodeUrl = qrData?.qr_code?.url || null
          if (qrCodeUrl) break
        }
        await new Promise(r => setTimeout(r, 2000))
      }
    } catch (e) {
      console.warn('QR Code polling failed (non-blocking):', e)
    }

    // 5. Save reference in sales table - use local path if available
    const fileUrl = storedPdfPath || pdfUrl || null
    await supabase
      .from('sales')
      .update({
        invoicexpress_id: invoiceId,
        invoicexpress_type: 'invoices',
        invoice_reference: invoiceReference,
        ...(fileUrl ? { invoice_pdf_url: fileUrl } : {}),
        ...(qrCodeUrl ? { qr_code_url: qrCodeUrl } : {}),
      })
      .eq('id', sale_id)

    return new Response(JSON.stringify({
      success: true,
      invoicexpress_id: invoiceId,
      invoice_reference: invoiceReference,
      ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
      ...(qrCodeUrl ? { qr_code_url: qrCodeUrl } : {}),
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
