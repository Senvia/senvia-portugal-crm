import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    const { 
      organization_id, 
      sale_id, 
      payment_id,
      original_document_id,
      original_document_type,
      reason,
      items,
    } = await req.json()

    if (!organization_id || !original_document_id || !original_document_type || !reason) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios: organization_id, original_document_id, original_document_type, reason' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify membership
    const { data: isMember } = await supabase.rpc('is_org_member', {
      _user_id: user.id,
      _org_id: organization_id,
    })

    if (!isMember) {
      return new Response(JSON.stringify({ error: 'Sem acesso a esta organização' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch org credentials
    const { data: org } = await supabase
      .from('organizations')
      .select('invoicexpress_account_name, invoicexpress_api_key, integrations_enabled, tax_config')
      .eq('id', organization_id)
      .single()

    const integrationsEnabled = (org?.integrations_enabled as Record<string, boolean> | null) || {}
    if (integrationsEnabled.invoicexpress === false || !org?.invoicexpress_account_name || !org?.invoicexpress_api_key) {
      return new Response(JSON.stringify({ error: 'Integração InvoiceXpress não configurada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const accountName = org.invoicexpress_account_name
    const apiKey = org.invoicexpress_api_key
    const baseUrl = `https://${accountName}.app.invoicexpress.com`

    // First, get the original document details to build the credit note
    const docEndpointMap: Record<string, string> = { 
      invoice: 'invoices', 
      invoice_receipt: 'invoice_receipts', 
      receipt: 'receipts' 
    }
    const originalEndpoint = docEndpointMap[original_document_type] || 'invoices'

    const originalRes = await fetch(
      `${baseUrl}/${originalEndpoint}/${original_document_id}.json?api_key=${apiKey}`,
      { method: 'GET', headers: { 'Accept': 'application/json' } }
    )

    if (!originalRes.ok) {
      return new Response(JSON.stringify({ error: 'Erro ao obter documento original do InvoiceXpress' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const originalData = await originalRes.json()
    const originalDoc = originalData[Object.keys(originalData)[0]] || {}

    // Build credit note items from original document or custom items
    let creditNoteItems: any[] = []
    
    if (items && items.length > 0) {
      // Custom items provided by user
      creditNoteItems = items.map((item: any) => ({
        name: item.name,
        description: item.description || item.name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        ...(item.tax ? { tax: item.tax } : {}),
      }))
    } else if (originalDoc.items) {
      // Copy items from original document
      const rawItems = Array.isArray(originalDoc.items) ? originalDoc.items : (originalDoc.items?.item ? [originalDoc.items.item] : [])
      creditNoteItems = rawItems.map((item: any) => ({
        name: item.name,
        description: item.description || item.name,
        unit_price: Number(item.unit_price || 0),
        quantity: Number(item.quantity || 1),
        ...(item.tax ? { tax: { name: item.tax.name, value: Number(item.tax.value || 0) } } : {}),
      }))
    }

    if (creditNoteItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Não foi possível determinar os itens para a nota de crédito' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Date
    const now = new Date()
    const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`

    // Tax exemption from original document
    const taxExemption = originalDoc.tax_exemption || null

    // Build credit note payload
    const creditNotePayload = {
      credit_note: {
        date: todayStr,
        due_date: todayStr,
        reference: originalDoc.sequential_number || `Doc #${original_document_id}`,
        observations: reason,
        ...(taxExemption ? { tax_exemption: taxExemption } : {}),
        client: originalDoc.client ? {
          name: originalDoc.client.name,
          code: originalDoc.client.code,
          fiscal_id: originalDoc.client.fiscal_id,
          email: originalDoc.client.email || '',
          address: originalDoc.client.address || '',
          city: originalDoc.client.city || '',
          postal_code: originalDoc.client.postal_code || '',
          country: originalDoc.client.country || 'Portugal',
        } : undefined,
        items: creditNoteItems,
      },
    }

    // 1. Create credit note
    const createRes = await fetch(`${baseUrl}/credit_notes.json?api_key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creditNotePayload),
    })

    if (!createRes.ok) {
      const errorText = await createRes.text()
      console.error('InvoiceXpress create credit note error:', errorText)
      return new Response(JSON.stringify({ 
        error: `Erro ao criar nota de crédito no InvoiceXpress: ${createRes.status}`,
        details: errorText,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const createData = await createRes.json()
    const creditNote = createData.credit_note || {}
    const creditNoteId = creditNote.id
    const creditNoteSeqNumber = creditNote.sequential_number

    if (!creditNoteId) {
      return new Response(JSON.stringify({ error: 'InvoiceXpress não retornou ID da nota de crédito' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Finalize credit note
    const finalizeRes = await fetch(
      `${baseUrl}/credit_notes/${creditNoteId}/change-state.json?api_key=${apiKey}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credit_note: { state: 'finalized' } }),
      }
    )

    let creditNoteReference = creditNoteSeqNumber ? `NC ${creditNoteSeqNumber}` : `NC #${creditNoteId}`
    
    if (finalizeRes.ok) {
      try {
        const finalizeData = await finalizeRes.json()
        if (finalizeData.credit_note?.sequential_number) {
          creditNoteReference = `NC ${finalizeData.credit_note.sequential_number}`
        }
      } catch {}
    } else {
      const errorText = await finalizeRes.text()
      console.error('InvoiceXpress finalize credit note error:', errorText)
      // Still save the draft reference
    }

    // 3. Save reference in database
    if (payment_id) {
      await supabase
        .from('sale_payments')
        .update({
          credit_note_id: creditNoteId,
          credit_note_reference: creditNoteReference,
        })
        .eq('id', payment_id)
    }
    
    if (sale_id) {
      await supabase
        .from('sales')
        .update({
          credit_note_id: creditNoteId,
          credit_note_reference: creditNoteReference,
        })
        .eq('id', sale_id)
    }

    return new Response(JSON.stringify({
      success: true,
      credit_note_id: creditNoteId,
      credit_note_reference: creditNoteReference,
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