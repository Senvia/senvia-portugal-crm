const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const API_URL = 'https://login.keyinvoice.com/API5.php'
const apiKey = '169137nd0pd56fa02d61291072f74e30997a158d31'

async function test(name: string, headers: Record<string,string>, body: any) {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    return { test: name, status: res.status, body: text.substring(0, 2000) }
  } catch (e) { return { test: name, error: String(e) } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  // First: try login with Apikey header to get a Sid
  let loginSid: string | null = null

  const loginResults = await Promise.all([
    test('login-A: Apikey header only', { 'Apikey': apiKey }, { method: 'login' }),
    test('login-B: Apikey + Key body', { 'Apikey': apiKey }, { method: 'login', Key: apiKey }),
    test('login-C: Apikey + ApiKey body', { 'Apikey': apiKey }, { method: 'login', ApiKey: apiKey }),
    test('login-D: no auth header + Apikey body', {}, { method: 'login', Apikey: apiKey }),
    // Maybe the key format is wrong - try without the prefix number
    test('login-E: key without prefix', { 'Apikey': 'nd0pd56fa02d61291072f74e30997a158d31' }, { method: 'login' }),
    // Maybe needs both Apikey and Sid
    test('login-F: Apikey=key in body JSON', {}, { method: 'login', apikey: apiKey }),
    // Try lowercase 
    test('login-G: apikey lowercase header', { 'apikey': apiKey }, { method: 'login' }),
  ])

  // Check if any login returned a Sid
  for (const r of loginResults) {
    try {
      const parsed = JSON.parse(r.body || '{}')
      if (parsed.Status === 1 && parsed.Data?.Sid) {
        loginSid = parsed.Data.Sid
        break
      }
      if (parsed.Sid) {
        loginSid = parsed.Sid
        break
      }
    } catch {}
  }

  let sessionResults: any[] = []
  if (loginSid) {
    sessionResults = await Promise.all([
      test('session: getDocTypes', { 'Sid': loginSid }, { method: 'getDocTypes' }),
      test('session: getCompanyInfo', { 'Sid': loginSid }, { method: 'getCompanyInfo' }),
    ])
  }

  // Also try: what if Status:0 means "empty results" not "error"?  
  // Try listClients with pagination params
  const extraTests = await Promise.all([
    test('extra-1: Apikey + listClients Page', { 'Apikey': apiKey }, { method: 'listClients', Page: 1, PerPage: 10 }),
    test('extra-2: Apikey + getDocTypes DocType=34', { 'Apikey': apiKey }, { method: 'getDocTypes', DocType: '34' }),
    test('extra-3: Apikey + getDocumentSeries', { 'Apikey': apiKey }, { method: 'getDocumentSeries', DocType: '34' }),
    // Try getDocuments instead of listDocuments
    test('extra-4: Apikey + getDocuments', { 'Apikey': apiKey }, { method: 'getDocuments', DocType: '34' }),
    // Try searchClients
    test('extra-5: Apikey + searchClients', { 'Apikey': apiKey }, { method: 'searchClients', Query: 'teste' }),
  ])

  return new Response(JSON.stringify({ 
    loginResults, 
    loginSid, 
    sessionResults,
    extraTests,
  }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
