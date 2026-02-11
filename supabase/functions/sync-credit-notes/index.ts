import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function downloadAndUploadPdf(
  supabase: any,
  pdfUrl: string,
  storagePath: string
): Promise<string | null> {
  try {
    const pdfRes = await fetch(pdfUrl)
    if (!pdfRes.ok) return null
    const pdfBlob = await pdfRes.blob()
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)

    const { error } = await supabase.storage
      .from('invoices')
      .upload(storagePath, uint8, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (error) {
      console.error('Upload error:', error)
      return null
    }
    return storagePath
  } catch (e) {
    console.error('Download/upload error:', e)
    return null
  }
}

async function pollPdfUrl(baseUrl: string, docId: number, apiKey: string): Promise<string | null> {
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(`${baseUrl}/api/pdf/${docId}.json?api_key=${apiKey}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      })
      if (res.status === 200) {
        const data = await res.json()
        const url = data?.output?.pdfUrl
        if (url) return url
      }
      if (i < 2) await new Promise(r => setTimeout(r, 2000))
    } catch (e) {
      if (i < 2) await new Promise(r => setTimeout(r, 2000))
    }
  }
  return null
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { organization_id } = await req.json()

    if (!organization_id) {
      return new Response(JSON.stringify({ error: 'organization_id é obrigatório' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get org credentials
    const { data: org } = await supabase
      .from('organizations')
      .select('invoicexpress_account_name, invoicexpress_api_key')
      .eq('id', organization_id)
      .single()

    if (!org?.invoicexpress_account_name || !org?.invoicexpress_api_key) {
      return new Response(JSON.stringify({ error: 'Credenciais InvoiceXpress não configuradas' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const baseUrl = `https://${org.invoicexpress_account_name}.app.invoicexpress.com`
    const apiKey = org.invoicexpress_api_key

    // Fetch all credit notes from InvoiceXpress (paginated)
    let allCreditNotes: any[] = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const url = `${baseUrl}/credit_notes.json?api_key=${apiKey}&page=${page}&per_page=50`
      console.log(`Fetching credit notes page ${page}...`)
      
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('InvoiceXpress error:', res.status, errorText)
        return new Response(JSON.stringify({ error: `Erro InvoiceXpress: ${res.status}` }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const data = await res.json()
      const notes = data?.credit_notes || []
      
      if (notes.length === 0) {
        hasMore = false
      } else {
        allCreditNotes = allCreditNotes.concat(notes)
        page++
        if (page > 20) hasMore = false
      }
    }

    console.log(`Found ${allCreditNotes.length} credit notes in InvoiceXpress`)

    let synced = 0
    let notMatched = 0

    for (const cn of allCreditNotes) {
      const cnId = cn.id
      const cnRef = cn.sequence_number || cn.inverted_sequence_number || `NC-${cnId}`
      const cnTotal = parseFloat(cn.total || '0')
      const cnDate = cn.date || null
      const cnClientName = cn.client?.name || null
      const cnStatus = cn.status || null

      // Get detailed info for related documents
      let relatedDocId: number | null = null
      let cnDetailRaw: any = cn

      try {
        const detailRes = await fetch(`${baseUrl}/credit_notes/${cnId}.json?api_key=${apiKey}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        })
        
        if (detailRes.ok) {
          const detailData = await detailRes.json()
          const cnDetail = detailData?.credit_note
          if (cnDetail) cnDetailRaw = cnDetail

          if (cnDetail?.related_documents && cnDetail.related_documents.length > 0) {
            relatedDocId = cnDetail.related_documents[0].id
          }
          if (!relatedDocId && cnDetail?.observations) {
            const match = cnDetail.observations.match(/(?:fatura|invoice|FR|FT)\s*[#:]?\s*(\d+)/i)
            if (match) relatedDocId = parseInt(match[1])
          }
        }
      } catch (e) {
        console.warn(`Failed to get details for CN ${cnId}:`, e)
      }

      // Try matching to local records
      let matchedSaleId: string | null = null
      let matchedPaymentId: string | null = null

      if (relatedDocId) {
        // 1. Match by invoicexpress_id in sales
        const { data: sale } = await supabase
          .from('sales')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('invoicexpress_id', relatedDocId)
          .maybeSingle()

        if (sale) {
          matchedSaleId = sale.id
          // Also update the sales record
          await supabase.from('sales').update({
            credit_note_id: cnId,
            credit_note_reference: cnRef,
          }).eq('id', sale.id)
        }

        // 2. Match by invoicexpress_id in sale_payments
        if (!matchedSaleId) {
          const { data: payment } = await supabase
            .from('sale_payments')
            .select('id, sale_id')
            .eq('organization_id', organization_id)
            .eq('invoicexpress_id', relatedDocId)
            .maybeSingle()

          if (payment) {
            matchedPaymentId = payment.id
            matchedSaleId = payment.sale_id || null
            await supabase.from('sale_payments').update({
              credit_note_id: cnId,
              credit_note_reference: cnRef,
            }).eq('id', payment.id)
          }
        }

        // 3. Match by invoice_reference text pattern in sale_payments
        if (!matchedSaleId && !matchedPaymentId) {
          // Get the sequence number of the related document to search in text references
          try {
            const relDocRes = await fetch(`${baseUrl}/documents/${relatedDocId}.json?api_key=${apiKey}`, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
            })
            if (relDocRes.ok) {
              const relDocData = await relDocRes.json()
              // Try different document type wrappers
              const relDoc = relDocData?.invoice_receipt || relDocData?.invoice || relDocData?.simplified_invoice || relDocData?.receipt
              const relSeq = relDoc?.sequence_number || relDoc?.inverted_sequence_number
              if (relSeq) {
                // Search sale_payments by invoice_reference containing the sequence
                const { data: payments } = await supabase
                  .from('sale_payments')
                  .select('id, sale_id')
                  .eq('organization_id', organization_id)
                  .ilike('invoice_reference', `%${relSeq}%`)
                  .limit(1)

                if (payments && payments.length > 0) {
                  matchedPaymentId = payments[0].id
                  matchedSaleId = payments[0].sale_id || null
                  await supabase.from('sale_payments').update({
                    credit_note_id: cnId,
                    credit_note_reference: cnRef,
                  }).eq('id', payments[0].id)
                }

                // Also try in sales.invoice_reference
                if (!matchedSaleId) {
                  const { data: sales } = await supabase
                    .from('sales')
                    .select('id')
                    .eq('organization_id', organization_id)
                    .ilike('invoice_reference', `%${relSeq}%`)
                    .limit(1)

                  if (sales && sales.length > 0) {
                    matchedSaleId = sales[0].id
                    await supabase.from('sales').update({
                      credit_note_id: cnId,
                      credit_note_reference: cnRef,
                    }).eq('id', sales[0].id)
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Failed to resolve related doc sequence:', e)
          }
        }
      }

      // 4. Fallback: match by client name
      if (!matchedSaleId && !matchedPaymentId && cnClientName) {
        const { data: salesByClient } = await supabase
          .from('sales')
          .select('id, crm_clients:client_id(name), leads:lead_id(name)')
          .eq('organization_id', organization_id)
          .is('credit_note_id', null)
          .limit(50)

        if (salesByClient) {
          for (const s of salesByClient) {
            const clientName = (s as any).crm_clients?.name || (s as any).leads?.name
            if (clientName && clientName.toLowerCase().includes(cnClientName.toLowerCase())) {
              matchedSaleId = s.id
              await supabase.from('sales').update({
                credit_note_id: cnId,
                credit_note_reference: cnRef,
              }).eq('id', s.id)
              break
            }
          }
        }
      }

      // Download PDF
      let pdfPath: string | null = null
      try {
        const pdfTempUrl = await pollPdfUrl(baseUrl, cnId, apiKey)
        if (pdfTempUrl) {
          const fileName = `${organization_id}/credit_note_${cnId}.pdf`
          pdfPath = await downloadAndUploadPdf(supabase, pdfTempUrl, fileName)
        }
      } catch (e) {
        console.warn(`Failed to download PDF for CN ${cnId}:`, e)
      }

      // Upsert into credit_notes table
      const { error: upsertError } = await supabase
        .from('credit_notes')
        .upsert({
          organization_id,
          invoicexpress_id: cnId,
          reference: cnRef,
          status: cnStatus,
          client_name: cnClientName,
          total: cnTotal,
          date: cnDate,
          related_invoice_id: relatedDocId,
          sale_id: matchedSaleId,
          payment_id: matchedPaymentId,
          pdf_path: pdfPath,
          raw_data: cnDetailRaw,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'organization_id,invoicexpress_id',
        })

      if (upsertError) {
        console.error(`Upsert error for CN ${cnId}:`, upsertError)
      }

      if (matchedSaleId || matchedPaymentId) {
        synced++
      } else {
        notMatched++
      }
    }

    console.log(`Sync complete: ${synced} matched, ${notMatched} not matched`)

    return new Response(JSON.stringify({
      total: allCreditNotes.length,
      synced,
      not_matched: notMatched,
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
