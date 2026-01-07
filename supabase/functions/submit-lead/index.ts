import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadSubmission {
  name: string;
  email: string;
  phone: string;
  gdpr_consent: boolean;
  public_key: string;
  source?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: LeadSubmission = await req.json();
    console.log('Lead submission received:', { ...body, email: '[REDACTED]' });

    // Validate required fields
    if (!body.name || !body.email || !body.phone || !body.public_key) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios em falta' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate GDPR consent
    if (!body.gdpr_consent) {
      console.error('GDPR consent not provided');
      return new Response(
        JSON.stringify({ error: 'É necessário aceitar a Política de Privacidade' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      console.error('Invalid email format');
      return new Response(
        JSON.stringify({ error: 'Formato de email inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone (Portuguese format)
    const phoneRegex = /^(\+351)?[0-9]{9}$/;
    const cleanPhone = body.phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      console.error('Invalid phone format');
      return new Response(
        JSON.stringify({ error: 'Formato de telemóvel inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate public_key and get organization_id (including webhook_url)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, webhook_url')
      .eq('public_key', body.public_key)
      .maybeSingle();

    if (orgError) {
      console.error('Error fetching organization:', orgError);
      return new Response(
        JSON.stringify({ error: 'Erro ao validar formulário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!org) {
      console.error('Invalid public_key:', body.public_key);
      return new Response(
        JSON.stringify({ error: 'Formulário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Organization found:', org.name);

    // Insert lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: org.id,
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: cleanPhone,
        gdpr_consent: true,
        source: body.source || 'Formulário Público',
        status: 'new',
      })
      .select()
      .single();

    if (leadError) {
      console.error('Error inserting lead:', leadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao guardar contacto' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Lead created successfully:', lead.id);

    // Dispatch webhook if configured (non-blocking)
    if (org.webhook_url) {
      console.log('Dispatching webhook to:', org.webhook_url);
      
      const webhookPayload = {
        event: 'lead.created',
        timestamp: new Date().toISOString(),
        organization: {
          id: org.id,
          name: org.name,
        },
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          status: lead.status,
          created_at: lead.created_at,
        },
      };

      // Fire and forget - don't block the response
      // Fire and forget - don't block the response
      fetch(org.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      })
        .then((res) => {
          console.log('Webhook dispatched successfully, status:', res.status);
        })
        .catch((err) => {
          console.error('Webhook dispatch failed:', err.message);
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contacto registado com sucesso',
        lead_id: lead.id 
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
