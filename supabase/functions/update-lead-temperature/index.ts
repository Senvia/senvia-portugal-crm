import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface UpdateRequest {
  lead_id: string;
  temperature: 'cold' | 'warm' | 'hot';
  organization_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🌡️ Update lead temperature request received');

  try {
    // Validar API Key (segurança - apenas n8n pode chamar)
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('N8N_WEBHOOK_SECRET');
    
    if (!expectedKey || apiKey !== expectedKey) {
      console.error('❌ Unauthorized: Invalid or missing API key');
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: UpdateRequest = await req.json();
    console.log('📦 Request body:', JSON.stringify(body, null, 2));

    // Validações
    if (!body.lead_id || !body.temperature || !body.organization_id) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios em falta',
          required: ['lead_id', 'temperature', 'organization_id']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['cold', 'warm', 'hot'].includes(body.temperature)) {
      console.error('❌ Invalid temperature value:', body.temperature);
      return new Response(
        JSON.stringify({ 
          error: 'Temperatura inválida',
          valid_values: ['cold', 'warm', 'hot']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar cliente Supabase com service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Actualizar lead
    const { data, error } = await supabase
      .from('leads')
      .update({ temperature: body.temperature })
      .eq('id', body.lead_id)
      .eq('organization_id', body.organization_id)
      .select()
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    if (!data) {
      console.error('❌ Lead not found');
      return new Response(
        JSON.stringify({ error: 'Lead não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Lead temperature updated:', data.id, '->', body.temperature);

    return new Response(
      JSON.stringify({ 
        success: true, 
        lead: {
          id: data.id,
          name: data.name,
          temperature: data.temperature,
          updated_at: data.updated_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Internal error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
