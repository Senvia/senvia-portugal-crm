import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PAYMENT_METHOD_MAP: Record<string, string> = {
  mbway: 'MB',
  transfer: 'TB',
  cash: 'NU',
  card: 'CC',
  check: 'CH',
  other: 'OU',
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

    const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { sale_id, payment_id, organization_id } = await req.json()
    if (!sale_id || !payment_id || !organization_id) {
      return new Response(JSON.stringify({ error: 'sale_id, payment_id e organization_id são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
      .select('invoicexpress_account_name, invoicexpress_api_key, integrations_enabled')
      .eq('id', organization_id)
      .single()

    const integrationsEnabled = (org?.integrations_enabled as Record<string, boolean> | null) || {}
    if (integrationsEnabled.invoicexpress === false || !org?.invoicexpress_account_name || !org?.invoicexpress_api_key) {
      return new Response(JSON.stringify({ error: 'Integração InvoiceXpress não configurada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch sale to get invoicexpress_id
    const { data: sale } = await supabase
      .from('sales')
      .select('id, invoicexpress_id, invoice_reference')
      .eq('id', sale_id)
      .eq('organization_id', organization_id)
      .single()

    if (!sale) {
      return new Response(JSON.stringify({ error: 'Venda não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!sale.invoicexpress_id) {
      return new Response(JSON.stringify({ error: 'A venda ainda não tem fatura emitida. Emita a fatura primeiro.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch payment
    const { data: payment } = await supabase
      .from('sale_payments')
      .select('*')
      .eq('id', payment_id)
      .eq('sale_id', sale_id)
      .single()

    if (!payment) {
      return new Response(JSON.stringify({ error: 'Pagamento não encontrado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (payment.invoice_reference) {
      return new Response(JSON.stringify({ 
        error: 'Recibo já gerado para este pagamento',
        invoice_reference: payment.invoice_reference,
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Status check removed: receipt can be issued for any payment status
    // Payment will be automatically marked as 'paid' after successful receipt generation

    // Format payment_date as dd/mm/yyyy
    const paymentDate = new Date(payment.payment_date)
    const formattedDate = `${String(paymentDate.getDate()).padStart(2, '0')}/${String(paymentDate.getMonth() + 1).padStart(2, '0')}/${paymentDate.getFullYear()}`

    const paymentMechanism = PAYMENT_METHOD_MAP[payment.payment_method || 'other'] || 'OU'

    const accountName = org.invoicexpress_account_name
    const apiKey = org.invoicexpress_api_key
    const baseUrl = `https://${accountName}.app.invoicexpress.com`
    const invoiceId = sale.invoicexpress_id

    // Call partial_payments endpoint
    const partialPaymentPayload = {
      partial_payment: {
        payment_mechanism: paymentMechanism,
        amount: Number(payment.amount),
        payment_date: formattedDate,
        note: payment.notes || `Pagamento - ${payment.payment_method ? payment.payment_method.toUpperCase() : ''}`,
      },
    }

    console.log('Calling partial_payments:', JSON.stringify(partialPaymentPayload))

    const receiptRes = await fetch(
      `${baseUrl}/documents/${invoiceId}/partial_payments.json?api_key=${apiKey}`,
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(partialPaymentPayload),
      }
    )

    if (!receiptRes.ok) {
      const errorText = await receiptRes.text()
      console.error('InvoiceXpress partial_payment error:', receiptRes.status, errorText)
      return new Response(JSON.stringify({ 
        error: `Erro ao gerar recibo no InvoiceXpress: ${receiptRes.status}`, 
        details: errorText,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const receiptData = await receiptRes.json()
    const receipt = receiptData.receipt || {}
    const receiptId = receipt.id
    const receiptSeqNumber = receipt.inverted_sequence_number || receipt.sequence_number
    const receiptPermalink = receipt.permalink || null

    const receiptReference = receiptSeqNumber ? `RC ${receiptSeqNumber}` : `RC #${receiptId}`

    // Try to get PDF
    let pdfUrl: string | null = null
    if (receiptId) {
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const pdfRes = await fetch(`${baseUrl}/api/pdf/${receiptId}.json?api_key=${apiKey}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          })
          if (pdfRes.status === 200) {
            const pdfData = await pdfRes.json()
            pdfUrl = pdfData?.output?.pdfUrl || null
            if (pdfUrl) break
          }
          await new Promise(r => setTimeout(r, 2000))
        }
      } catch (e) {
        console.warn('PDF polling failed (non-blocking):', e)
      }
    }

    // QR Code polling for receipt
    let qrCodeUrl: string | null = null
    if (receiptId) {
      try {
        for (let attempt = 0; attempt < 3; attempt++) {
          const qrRes = await fetch(`${baseUrl}/api/qr_codes/${receiptId}.json?api_key=${apiKey}`, {
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
    }

    // Save receipt reference in sale_payment
    const fileUrl = pdfUrl || receiptPermalink || null
    await supabase
      .from('sale_payments')
      .update({
        invoice_reference: receiptReference,
        invoicexpress_id: receiptId || null,
        status: 'paid',
        ...(fileUrl ? { invoice_file_url: fileUrl } : {}),
        ...(qrCodeUrl ? { qr_code_url: qrCodeUrl } : {}),
      })
      .eq('id', payment_id)

    return new Response(JSON.stringify({
      success: true,
      receipt_id: receiptId,
      invoice_reference: receiptReference,
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
