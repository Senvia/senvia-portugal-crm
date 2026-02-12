import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DOC_TYPE_MAP: Record<string, string> = {
  invoice: 'invoices',
  invoice_receipt: 'invoice_receipts',
  receipt: 'receipts',
}

const DEFAULT_KEYINVOICE_API_URL = 'https://app.keyinvoice.com/API/'

// KeyInvoice DocType mapping
const KI_DOC_TYPE_MAP: Record<string, string> = {
  invoice: '4',
  invoice_receipt: '34',
  receipt: '34',
  credit_note: '7',
}

async function getKeyInvoiceSid(supabase: any, org: any, organizationId: string): Promise<string> {
  // Check cached Sid
  if (org.keyinvoice_token && org.keyinvoice_token_expires_at) {
    const expiresAt = new Date(org.keyinvoice_token_expires_at)
    if (expiresAt > new Date()) return org.keyinvoice_token
  }

  const apiUrl = org.keyinvoice_api_url || DEFAULT_KEYINVOICE_API_URL

  const loginPayload: Record<string, string> = {
    method: 'login',
    username: org.keyinvoice_username,
    password: org.keyinvoice_password,
  }
  if (org.keyinvoice_company_code) loginPayload.companyCode = org.keyinvoice_company_code

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginPayload),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`KeyInvoice auth failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  if (data.Status !== 1 || !data.Data?.Sid) {
    throw new Error(`KeyInvoice login failed: ${data.ErrorMessage || 'Unknown error'}`)
  }

  const sid = data.Data.Sid
  const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
  await supabase.from('organizations').update({ keyinvoice_token: sid, keyinvoice_token_expires_at: expiresAt }).eq('id', organizationId)
  return sid
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { document_id, document_type, organization_id, email, subject, body } = await req.json()

    if (!document_id || !document_type || !organization_id || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
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
      return new Response(JSON.stringify({ error: 'Not a member of this organization' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get organization credentials
    const { data: org } = await supabase
      .from('organizations')
      .select('invoicexpress_account_name, invoicexpress_api_key, billing_provider, keyinvoice_username, keyinvoice_password, keyinvoice_company_code, keyinvoice_token, keyinvoice_token_expires_at, keyinvoice_api_url')
      .eq('id', organization_id)
      .single()

    const billingProvider = (org as any)?.billing_provider || 'invoicexpress'

    if (billingProvider === 'keyinvoice') {
      // KeyInvoice email flow using real API: method:"sendDocumentPDF2Email"
      if (!org?.keyinvoice_username || !org?.keyinvoice_password) {
        return new Response(JSON.stringify({ error: 'Credenciais KeyInvoice não configuradas' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const sid = await getKeyInvoiceSid(supabase, org, organization_id)
      const apiUrl = org.keyinvoice_api_url || DEFAULT_KEYINVOICE_API_URL
      const docType = KI_DOC_TYPE_MAP[document_type] || '4'

      const emailPayload = {
        method: 'sendDocumentPDF2Email',
        DocType: docType,
        DocNum: String(document_id),
        EmailDestinations: email,
        EmailSubject: subject || 'Documento',
        EmailBody: body || '',
      }

      const emailRes = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Sid': sid },
        body: JSON.stringify(emailPayload),
      })

      if (!emailRes.ok) {
        const errorText = await emailRes.text()
        console.error('KeyInvoice email HTTP error:', emailRes.status, errorText)
        return new Response(JSON.stringify({ error: `KeyInvoice email error: ${emailRes.status}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const emailData = await emailRes.json()
      if (emailData.Status !== 1) {
        console.error('KeyInvoice email failed:', emailData.ErrorMessage)
        return new Response(JSON.stringify({ error: `KeyInvoice: ${emailData.ErrorMessage || 'Erro ao enviar email'}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      // InvoiceXpress email flow
      if (!org?.invoicexpress_account_name || !org?.invoicexpress_api_key) {
        return new Response(JSON.stringify({ error: 'InvoiceXpress not configured' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const apiType = DOC_TYPE_MAP[document_type] || document_type
      const baseUrl = `https://${org.invoicexpress_account_name}.app.invoicexpress.com`
      const url = `${baseUrl}/${apiType}/${document_id}/email-document.json?api_key=${org.invoicexpress_api_key}`

      const payload = {
        message: {
          client: { email, save: '0' },
          subject: subject || '',
          body: body || '',
          logo: '0',
        },
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error('InvoiceXpress email error:', res.status, errorText)
        return new Response(JSON.stringify({ error: `InvoiceXpress error: ${res.status}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-invoice-email error:', err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
