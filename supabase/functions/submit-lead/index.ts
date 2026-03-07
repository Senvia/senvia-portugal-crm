import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Fixed system webhook - always dispatched, never visible to clients
const SENVIA_SYSTEM_WEBHOOK_URL = 'https://n8n-n8n.tx2a4o.easypanel.host/webhook/senvia-os';

interface LeadSubmission {
  company_nif?: string | null;
  company_name?: string | null;
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

    // Validate public_key and get organization_id (including webhook_url, whatsapp config, and meta_pixels)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, niche, webhook_url, whatsapp_instance, whatsapp_api_key, whatsapp_base_url, meta_pixels, sales_settings, brevo_api_key, brevo_sender_email, slug')
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
      meta_pixels: null as any[] | null,
      target_stage: null as string | null,
    };

    if (body.form_id) {
      const { data: form, error: formError } = await supabase
        .from('forms')
        .select('id, name, form_settings, ai_qualification_rules, msg_template_hot, msg_template_warm, msg_template_cold, assigned_to, meta_pixels, target_stage')
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
          meta_pixels: Array.isArray(form.meta_pixels) ? form.meta_pixels : null,
          target_stage: form.target_stage || null,
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

    // ===== ROUND-ROBIN AUTO-ASSIGN =====
    let autoAssignedTo: string | null = formSettings.assigned_to || null;
    
    if (!autoAssignedTo) {
      const salesSettings = (org.sales_settings as any) || {};
      if (salesSettings.auto_assign_leads) {
        try {
          const { data: members } = await supabase
            .from('organization_members')
            .select('user_id')
            .eq('organization_id', org.id)
            .eq('is_active', true)
            .order('joined_at', { ascending: true });

          if (members && members.length > 0) {
            const currentIndex = salesSettings.round_robin_index || 0;
            const safeIndex = currentIndex % members.length;
            autoAssignedTo = members[safeIndex].user_id;
            const nextIndex = (safeIndex + 1) % members.length;

            // Update round_robin_index
            await supabase
              .from('organizations')
              .update({
                sales_settings: {
                  ...salesSettings,
                  round_robin_index: nextIndex,
                },
              })
              .eq('id', org.id);

            console.log(`Round-robin assigned lead to member index ${safeIndex}, next: ${nextIndex}`);
          }
        } catch (rrErr) {
          console.error('Round-robin assignment failed:', rrErr);
        }
      }
    }

    // Insert lead with custom data - use defaults for required DB fields
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id: org.id,
        form_id: body.form_id || null,
        assigned_to: autoAssignedTo,
        company_nif: body.company_nif?.trim() || null,
        company_name: body.company_name?.trim() || null,
        name: org.niche === 'telecom'
          ? (body.company_name?.trim() || body.name?.trim() || 'Anónimo')
          : (body.name?.trim() || body.company_name?.trim() || 'Anónimo'),
        email: body.email?.trim()?.toLowerCase() || 'nao-fornecido@placeholder.local',
        phone: cleanPhone || '000000000',
        gdpr_consent: true,
        source: body.source || formSettings.form_name || 'Formulário Público',
        status: formSettings.target_stage || 'new',
        notes: formSettings.form_name ? `Formulário: ${formSettings.form_name}` : (body.notes || null),
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

    // Transform custom_data IDs to human-readable labels
    const transformedCustomData = mapCustomDataToLabels(
      body.custom_data || null,
      formSettings.form_settings as any
    );

    // Fetch active webhooks from organization_webhooks table
    const { data: activeWebhooks } = await supabase
      .from('organization_webhooks')
      .select('url')
      .eq('organization_id', org.id)
      .eq('is_active', true);

    // Collect all webhook URLs: system + user webhooks
    const webhookUrls: string[] = [SENVIA_SYSTEM_WEBHOOK_URL];
    if (activeWebhooks) {
      for (const wh of activeWebhooks) {
        if (wh.url && !webhookUrls.includes(wh.url)) {
          webhookUrls.push(wh.url);
        }
      }
    }
    // Also include legacy webhook_url if set (backwards compat)
    if (org.webhook_url && !webhookUrls.includes(org.webhook_url)) {
      webhookUrls.push(org.webhook_url);
    }

    // Build webhook payload
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
        company_nif: lead.company_nif,
        company_name: lead.company_name,
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

    // Fire all webhooks (non-blocking)
    for (const url of webhookUrls) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload),
      })
        .then((res) => {
          console.info(`Webhook dispatched to ${url}, status: ${res.status}`);
        })
        .catch((err) => {
          console.error(`Webhook dispatch to ${url} failed:`, err.message);
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

    // ===== META CONVERSIONS API (CAPI) =====
    // Send server-side Lead event to Facebook for each active pixel
    try {
      // Get client IP and user agent from request headers
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                        req.headers.get('cf-connecting-ip') || '';
      const clientUserAgent = req.headers.get('user-agent') || '';

      // Extract fbclid/fbp from custom_data for Meta attribution
      const fbclid = (body.custom_data as Record<string, unknown>)?.fbclid as string | undefined;
      const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;
      const fbp = (body.custom_data as Record<string, unknown>)?.fbp as string | undefined;
      
      if (fbc) console.log('CAPI: fbc constructed from fbclid:', fbc);
      
      // Determine which pixels to fire — form-level overrides org-level
      const pixelsToFire: Array<{ pixel_id: string; enabled: boolean }> = 
        (formSettings.meta_pixels && formSettings.meta_pixels.length > 0)
          ? formSettings.meta_pixels
          : (Array.isArray(org.meta_pixels) ? org.meta_pixels : []);
      
      const activePixels = pixelsToFire.filter((p: any) => p.enabled && p.pixel_id);
      
      for (const pixel of activePixels) {
        fetch(`${supabaseUrl}/functions/v1/meta-capi-event`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            pixel_id: pixel.pixel_id,
            event_name: 'Lead',
            event_id: lead.id,
            event_source_url: req.headers.get('referer') || undefined,
            user_data: {
              em: lead.email !== 'nao-fornecido@placeholder.local' ? lead.email : undefined,
              ph: lead.phone !== '000000000' ? lead.phone : undefined,
              client_ip_address: clientIp || undefined,
              client_user_agent: clientUserAgent || undefined,
              fbc: fbc || undefined,
              fbp: fbp || undefined,
            },
            custom_data: {
              content_name: formSettings.form_name || 'Formulário Público',
              content_category: org.niche || 'lead',
            },
          }),
        })
          .then((res) => console.info(`CAPI Lead event sent to pixel ${pixel.pixel_id}, status: ${res.status}`))
          .catch((err) => console.error(`CAPI dispatch failed for pixel ${pixel.pixel_id}:`, err.message));
      }
    } catch (capiError) {
      console.error('Error dispatching CAPI events:', capiError);
    }

    // ===== EMAIL NOTIFICATION (Brevo) =====
    // Notify admins + assigned salesperson about the new lead
    try {
      const brevoKey = (org as any).brevo_api_key;
      const brevoSender = (org as any).brevo_sender_email;

      if (brevoKey && brevoSender) {
        // Fetch admin emails
        const { data: adminMembers } = await supabase
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', org.id)
          .eq('role', 'admin')
          .eq('is_active', true);

        const adminIds = (adminMembers || []).map((m: any) => m.user_id);

        // Add assigned salesperson if exists and not already in admin list
        if (autoAssignedTo && !adminIds.includes(autoAssignedTo)) {
          adminIds.push(autoAssignedTo);
        }

        if (adminIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, email, full_name')
            .in('id', adminIds);

          const recipients = (profiles || [])
            .filter((p: any) => p.email)
            .map((p: any) => ({ email: p.email, name: p.full_name || p.email }));

          if (recipients.length > 0) {
            const orgSlug = (org as any).slug || '';
            const leadsUrl = `https://senvia-portugal-crm.lovable.app/leads`;

            const htmlContent = `
              <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                <h2 style="color:#10b981">🚀 Novo Lead Recebido</h2>
                <table style="width:100%;border-collapse:collapse;margin:16px 0">
                  <tr><td style="padding:8px;font-weight:bold;color:#6b7280">Nome</td><td style="padding:8px">${lead.name}</td></tr>
                  ${lead.phone && lead.phone !== '000000000' ? `<tr><td style="padding:8px;font-weight:bold;color:#6b7280">Telefone</td><td style="padding:8px">${lead.phone}</td></tr>` : ''}
                  ${lead.email && lead.email !== 'nao-fornecido@placeholder.local' ? `<tr><td style="padding:8px;font-weight:bold;color:#6b7280">Email</td><td style="padding:8px">${lead.email}</td></tr>` : ''}
                  <tr><td style="padding:8px;font-weight:bold;color:#6b7280">Fonte</td><td style="padding:8px">${lead.source || 'Formulário Público'}</td></tr>
                  ${formSettings.form_name ? `<tr><td style="padding:8px;font-weight:bold;color:#6b7280">Formulário</td><td style="padding:8px">${formSettings.form_name}</td></tr>` : ''}
                  ${lead.company_name ? `<tr><td style="padding:8px;font-weight:bold;color:#6b7280">Empresa</td><td style="padding:8px">${lead.company_name}</td></tr>` : ''}
                </table>
                <a href="${leadsUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:8px">Ver Lead no Senvia</a>
                <p style="color:#9ca3af;font-size:12px;margin-top:24px">Organização: ${org.name}</p>
              </div>
            `;

            fetch('https://api.brevo.com/v3/smtp/email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'api-key': brevoKey,
              },
              body: JSON.stringify({
                sender: { email: brevoSender, name: org.name },
                to: recipients,
                subject: `🚀 Novo Lead: ${lead.name} - ${lead.source || 'Formulário'}`,
                htmlContent,
              }),
            })
              .then((res) => console.info(`Brevo new-lead email sent, status: ${res.status}`))
              .catch((err) => console.error('Brevo new-lead email failed:', err.message));
          }
        }
      } else {
        console.log('Brevo not configured for org, skipping email notification');
      }
    } catch (emailError) {
      console.error('Error sending new-lead email:', emailError);
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
