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
    if (!pdfRes.ok) {
      console.warn('Failed to download PDF:', pdfRes.status)
      return null
    }
    const pdfBlob = await pdfRes.blob()
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const uint8 = new Uint8Array(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(storagePath, uint8, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
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
      console.warn(`PDF poll attempt ${i + 1} failed:`, e)
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
        // Safety limit
        if (page > 20) hasMore = false
      }
    }

    console.log(`Found ${allCreditNotes.length} credit notes in InvoiceXpress`)

    let synced = 0
    let notMatched = 0
    const results: any[] = []

    for (const cn of allCreditNotes) {
      const cnId = cn.id
      const cnRef = cn.sequence_number || cn.inverted_sequence_number || `NC-${cnId}`
      
      // Try to get the related document from the credit note details
      const detailUrl = `${baseUrl}/credit_notes/${cnId}.json?api_key=${apiKey}`
      let relatedDocId: number | null = null

      try {
        const detailRes = await fetch(detailUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        })
        
        if (detailRes.ok) {
          const detailData = await detailRes.json()
          const cnDetail = detailData?.credit_note
          
          // Check for related documents
          if (cnDetail?.related_documents && cnDetail.related_documents.length > 0) {
            relatedDocId = cnDetail.related_documents[0].id
          }
          // Also check observations for invoice reference
          if (!relatedDocId && cnDetail?.observations) {
            const match = cnDetail.observations.match(/(?:fatura|invoice|FR|FT)\s*[#:]?\s*(\d+)/i)
            if (match) {
              relatedDocId = parseInt(match[1])
            }
          }
        }
      } catch (e) {
        console.warn(`Failed to get details for CN ${cnId}:`, e)
      }

      let matched = false

      if (relatedDocId) {
        // Try to match in sales table
        const { data: sale } = await supabase
          .from('sales')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('invoicexpress_id', relatedDocId)
          .maybeSingle()

        if (sale) {
          await supabase
            .from('sales')
            .update({
              credit_note_id: cnId,
              credit_note_reference: cnRef,
            })
            .eq('id', sale.id)

          matched = true
        }

        // Try sale_payments
        if (!matched) {
          const { data: payment } = await supabase
            .from('sale_payments')
            .select('id')
            .eq('organization_id', organization_id)
            .eq('invoicexpress_id', relatedDocId)
            .maybeSingle()

          if (payment) {
            await supabase
              .from('sale_payments')
              .update({
                credit_note_id: cnId,
                credit_note_reference: cnRef,
              })
              .eq('id', payment.id)

            matched = true
          }
        }
      }

      // If no related doc found, try matching by client name in sales
      if (!matched && cn.client?.name) {
        // Try finding a sale with matching client that doesn't already have a credit note
        const { data: salesByClient } = await supabase
          .from('sales')
          .select('id, invoicexpress_id, crm_clients:client_id(name), leads:lead_id(name)')
          .eq('organization_id', organization_id)
          .is('credit_note_id', null)
          .limit(50)

        if (salesByClient) {
          for (const s of salesByClient) {
            const clientName = (s as any).crm_clients?.name || (s as any).leads?.name
            if (clientName && clientName.toLowerCase().includes(cn.client.name.toLowerCase())) {
              await supabase
                .from('sales')
                .update({
                  credit_note_id: cnId,
                  credit_note_reference: cnRef,
                })
                .eq('id', s.id)

              matched = true
              break
            }
          }
        }
      }

      // Download and store PDF
      let storagePath: string | null = null
      try {
        const pdfTempUrl = await pollPdfUrl(baseUrl, cnId, apiKey)
        if (pdfTempUrl) {
          const fileName = `${organization_id}/credit_note_${cnId}.pdf`
          storagePath = await downloadAndUploadPdf(supabase, pdfTempUrl, fileName)
        }
      } catch (e) {
        console.warn(`Failed to download PDF for CN ${cnId}:`, e)
      }

      // If matched and we have a PDF, update the pdf field too
      if (matched && storagePath) {
        // Update the matched record with the PDF path
        const { data: matchedSale } = await supabase
          .from('sales')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('credit_note_id', cnId)
          .maybeSingle()

        if (matchedSale) {
          // Store CN PDF in a dedicated field - we'll use invoice_pdf_url for now
          // but prefix check in frontend
        }

        const { data: matchedPayment } = await supabase
          .from('sale_payments')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('credit_note_id', cnId)
          .maybeSingle()

        if (matchedPayment && storagePath) {
          await supabase
            .from('sale_payments')
            .update({ invoice_file_url: storagePath })
            .eq('id', matchedPayment.id)
        }
      }

      if (matched) {
        synced++
      } else {
        notMatched++
      }

      results.push({
        id: cnId,
        reference: cnRef,
        matched,
        client: cn.client?.name || null,
        total: cn.total,
        pdf_stored: !!storagePath,
      })
    }

    console.log(`Sync complete: ${synced} matched, ${notMatched} not matched`)

    return new Response(JSON.stringify({
      total: allCreditNotes.length,
      synced,
      not_matched: notMatched,
      details: results,
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
