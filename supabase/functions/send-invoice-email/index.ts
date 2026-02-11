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

    // Get InvoiceXpress credentials
    const { data: org } = await supabase
      .from('organizations')
      .select('invoicexpress_account_name, invoicexpress_api_key')
      .eq('id', organization_id)
      .single()

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
