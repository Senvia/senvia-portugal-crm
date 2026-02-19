import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadSubmission {
  company_nif?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  gdpr_consent: boolean;
  public_key: string;
  form_id?: string | null;
  source?: string;
  notes?: string | null;
  custom_data?: Record<string, unknown>;
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

    // Validate public_key is required
    if (!body.public_key) {
      console.error('Missing public_key');
      return new Response(
        JSON.stringify({ error: 'Formulário inválido' }),
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

    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        console.error('Invalid email format');
        return new Response(
          JSON.stringify({ error: 'Formato de email inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Clean phone number if provided
    let cleanPhone = null;
    if (body.phone) {
      cleanPhone = body.phone.replace(/\s/g, '');
      // More flexible phone validation - just check it has reasonable length
      if (cleanPhone.length < 9 || cleanPhone.length > 15) {
        console.error('Invalid phone format');
        return new Response(
          JSON.stringify({ error: 'Formato de telemóvel inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create Supabase client with service role to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Validate public_key and get organization_id (including webhook_url and whatsapp config)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, webhook_url, whatsapp_instance, whatsapp_api_key, whatsapp_base_url')
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

    // Get form-specific automation settings if form_id is provided
    let formSettings = {
      ai_qualification_rules: null as string | null,
      msg_template_hot: null as string | null,
      msg_template_warm: null as string | null,
      msg_template_cold: null as string | null,
      form_settings: null as any,
      form_name: null as string | null,
      assigned_to: null as string | null,
    };

    if (body.form_id) {
      const { data: form, error: formError } = await supabase
        .from('forms')
        .select('id, name, form_settings, ai_qualification_rules, msg_template_hot, msg_template_warm, msg_template_cold, assigned_to')
        .eq('id', body.form_id)
        .eq('organization_id', org.id)
        .maybeSingle();

      if (!formError && form) {
        formSettings = {
          ai_qualification_rules: form.ai_qualification_rules,
          msg_template_hot: form.msg_template_hot,
          msg_template_warm: form.msg_template_warm,
          msg_template_cold: form.msg_template_cold,
          form_settings: form.form_settings,
          form_name: form.name,
          assigned_to: form.assigned_to,
        };
        console.log('Form-specific settings loaded for:', form.name);
      }
    }

    // At least one contact method should be provided
    const hasName = body.name && body.name.trim().length > 0;
    const hasEmail = body.email && body.email.trim().length > 0;
    const hasPhone = cleanPhone && cleanPhone.length > 0;
    
    if (!hasName && !hasEmail && !hasPhone) {
      console.error('No contact information provided');
      return new Response(
        JSON.stringify({ error: 'É necessário fornecer pelo menos um método de contacto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== DEDUPLICATION CHECK =====
    // Prevent duplicate leads with same phone within 60 seconds
    if (cleanPhone && cleanPhone !== '000000000') {
      const sixtySecondsAgo = new Date(Date.now() - 60000).toISOString();
      
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id, created_at')
        .eq('phone', cleanPhone)
        .eq('organization_id', org.id)
        .gte('created_at', sixtySecondsAgo)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingLead) {
        console.log('Duplicate lead detected (same phone within 60s), returning existing:', existingLead.id);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Lead já registado',
            lead_id: existingLead.id,
            duplicate: true 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Insert lead with custom data - use defaults for required DB fields
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: org.id,
        form_id: body.form_id || null,
        assigned_to: formSettings.assigned_to || null,
        company_nif: body.company_nif?.trim() || null,
        name: body.name?.trim() || 'Anónimo',
        email: body.email?.trim()?.toLowerCase() || 'nao-fornecido@placeholder.local',
        phone: cleanPhone || '000000000',
        gdpr_consent: true,
        source: body.source || formSettings.form_name || 'Formulário Público',
        status: 'new',
        notes: body.notes || null,
        custom_data: body.custom_data || {},
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

    // Function to map custom_data IDs to human-readable labels
    const mapCustomDataToLabels = (
      customData: Record<string, unknown> | null,
      formSettingsData: { custom_fields?: Array<{ id: string; label: string }> } | null
    ): Record<string, unknown> => {
      if (!customData) return {};
      if (!formSettingsData?.custom_fields) return customData;
      
      const result: Record<string, unknown> = {};
      
      for (const [fieldId, value] of Object.entries(customData)) {
        // Find field by ID
        const field = formSettingsData.custom_fields.find(f => f.id === fieldId);
        
        if (field) {
          // Use label as key
          result[field.label] = value;
        } else {
          // Keep ID if no match (UTM params or other fields)
          result[fieldId] = value;
        }
      }
      
      return result;
    };

    // Dispatch webhook if configured (non-blocking)
    if (org.webhook_url) {
      console.info(`Dispatching webhook to: ${org.webhook_url}`);
      
      // Check if any WhatsApp field is configured
      const hasWhatsApp = org.whatsapp_instance || org.whatsapp_base_url || org.whatsapp_api_key;
      
      // Secure logging (never log full API key)
      console.info(`WhatsApp configured: ${hasWhatsApp ? 'yes' : 'no'}`);
      if (hasWhatsApp) {
        console.info(`WhatsApp instance: ${org.whatsapp_instance || 'not set'}`);
        console.info(`WhatsApp base URL: ${org.whatsapp_base_url || 'not set'}`);
        console.info(`WhatsApp API key set: ${org.whatsapp_api_key ? 'yes' : 'no'}`);
      }
      console.info(`Message templates set (form-specific): hot=${!!formSettings.msg_template_hot}, warm=${!!formSettings.msg_template_warm}, cold=${!!formSettings.msg_template_cold}`);
      
      // Transform custom_data from IDs to labels for webhook
      const transformedCustomData = mapCustomDataToLabels(
        lead.custom_data as Record<string, unknown>,
        formSettings.form_settings as { custom_fields?: Array<{ id: string; label: string }> }
      );
      
      const webhookPayload = {
        event: 'lead.created',
        timestamp: new Date().toISOString(),
        organization: {
          id: org.id,
          name: org.name,
        },
        form: {
          id: body.form_id || null,
          name: formSettings.form_name || null,
        },
        config: {
          whatsapp_instance: org.whatsapp_instance || null,
          whatsapp_api_key: org.whatsapp_api_key || null,
          whatsapp_base_url: org.whatsapp_base_url || null,
          // Form-specific automation settings
          ai_qualification_rules: formSettings.ai_qualification_rules || null,
          msg_template_hot: formSettings.msg_template_hot || null,
          msg_template_warm: formSettings.msg_template_warm || null,
          msg_template_cold: formSettings.msg_template_cold || null,
        },
        lead: {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          source: lead.source,
          status: lead.status,
          temperature: lead.temperature,
          value: lead.value,
          notes: lead.notes,
          gdpr_consent: lead.gdpr_consent,
          custom_data: transformedCustomData,
          created_at: lead.created_at,
          updated_at: lead.updated_at,
        },
      };

      // Fire and forget - don't block the response
      fetch(org.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      })
        .then((res) => {
          console.info(`Webhook dispatched successfully, status: ${res.status}`);
        })
        .catch((err) => {
          console.error('Webhook dispatch failed:', err.message);
        });
    }

    // Send push notification to organization members (non-blocking)
    try {
      const pushPayload = {
        organization_id: org.id,
        title: '🚀 Novo Lead!',
        body: `${lead.name} - ${lead.source || 'Formulário Público'}`,
        url: '/leads',
        tag: `lead-${lead.id}`,
      };

      fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(pushPayload),
      })
        .then((res) => {
          console.info(`Push notification dispatched, status: ${res.status}`);
        })
        .catch((err) => {
          console.error('Push notification failed:', err.message);
        });
    } catch (pushError) {
      console.error('Error preparing push notification:', pushError);
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
