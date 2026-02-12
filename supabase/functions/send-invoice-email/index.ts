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
      .select('invoicexpress_account_name, invoicexpress_api_key, billing_provider, keyinvoice_username, keyinvoice_password, keyinvoice_company_code, keyinvoice_token, keyinvoice_token_expires_at')
      .eq('id', organization_id)
      .single()

    const billingProvider = (org as any)?.billing_provider || 'invoicexpress'

    if (billingProvider === 'keyinvoice') {
      // KeyInvoice email flow
      if (!org?.keyinvoice_username || !org?.keyinvoice_password) {
        return new Response(JSON.stringify({ error: 'Credenciais KeyInvoice não configuradas' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      let kiToken = org.keyinvoice_token
      if (!kiToken || !org.keyinvoice_token_expires_at || new Date(org.keyinvoice_token_expires_at) <= new Date()) {
        const loginPayload: Record<string, string> = { username: org.keyinvoice_username, password: org.keyinvoice_password }
        if (org.keyinvoice_company_code) loginPayload.company_code = org.keyinvoice_company_code
        const loginRes = await fetch('https://api.cloudinvoice.net/auth/login/', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginPayload),
        })
        if (!loginRes.ok) {
          return new Response(JSON.stringify({ error: 'Erro autenticação KeyInvoice' }), {
            status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const { key } = await loginRes.json()
        kiToken = key
        await supabase.from('organizations').update({
          keyinvoice_token: key,
          keyinvoice_token_expires_at: new Date(Date.now() + 23 * 3600000).toISOString(),
        }).eq('id', organization_id)
      }

      const emailRes = await fetch(`https://api.cloudinvoice.net/documents/${document_id}/email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Token ${kiToken}` },
        body: JSON.stringify({ email, subject: subject || '', body: body || '' }),
      })

      if (!emailRes.ok) {
        const errorText = await emailRes.text()
        console.error('KeyInvoice email error:', emailRes.status, errorText)
        return new Response(JSON.stringify({ error: `KeyInvoice email error: ${emailRes.status}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      await emailRes.text()
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
