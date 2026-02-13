import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  email: string;
  name: string;
  clientId?: string;
  variables?: Record<string, string>;
}

interface SendTemplateRequest {
  organizationId: string;
  templateId?: string;
  recipients: Recipient[];
  campaignId?: string;
  settings?: Record<string, boolean>;
  settingsData?: Record<string, string>;
  subject?: string;
  htmlContent?: string;
}

function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, value || '');
  }
  return result;
}

function formatDate(): string {
  return new Date().toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

// Add UTM parameters to all links in HTML
function addUtmTracking(html: string, campaignName: string): string {
  return html.replace(
    /href="(https?:\/\/[^"]+)"/gi,
    (_match, url) => {
      try {
        const u = new URL(url);
        u.searchParams.set('utm_source', 'brevo');
        u.searchParams.set('utm_medium', 'email');
        u.searchParams.set('utm_campaign', campaignName);
        return `href="${u.toString()}"`;
      } catch {
        return _match;
      }
    }
  );
}

// Apply campaign settings to HTML content
function applyHtmlSettings(
  html: string,
  settings: Record<string, boolean>,
  settingsData: Record<string, string>
): string {
  let result = html;

  // Custom header
  if (settings.custom_header && settingsData.custom_header) {
    result = settingsData.custom_header + result;
  }

  // Custom footer
  if (settings.custom_footer && settingsData.custom_footer) {
    result = result + settingsData.custom_footer;
  }

  // Custom unsubscribe URL
  if (settings.custom_unsubscribe && settingsData.custom_unsubscribe) {
    result = result.replace(
      /\{\{\s*unsubscribe\s*\}\}/gi,
      settingsData.custom_unsubscribe
    );
  }

  // GA tracking
  if (settings.ga_tracking && settingsData.ga_tracking) {
    result = addUtmTracking(result, settingsData.ga_tracking);
  }

  return result;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      organizationId, templateId, recipients, campaignId,
      settings = {}, settingsData = {},
      subject: customSubject, htmlContent: customHtmlContent,
    }: SendTemplateRequest = await req.json();

    if (!organizationId || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Need either a templateId or custom subject+htmlContent
    if (!templateId && (!customSubject || !customHtmlContent)) {
      return new Response(
        JSON.stringify({ error: "Missing template or custom content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch template if provided
    let templateSubject = customSubject || '';
    let templateHtmlContent = customHtmlContent || '';

    if (templateId) {
      const { data: template, error: templateError } = await supabase
        .from("email_templates")
        .select("*")
        .eq("id", templateId)
        .eq("organization_id", organizationId)
        .single();

      if (templateError || !template) {
        console.error("Template not found:", templateError);
        return new Response(
          JSON.stringify({ error: "Template not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      templateSubject = template.subject;
      templateHtmlContent = template.html_content;
    }

    // Fetch organization for Brevo config
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, brevo_api_key, brevo_sender_email")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      return new Response(
        JSON.stringify({ error: "Organization not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!org.brevo_api_key || !org.brevo_sender_email) {
      return new Response(
        JSON.stringify({ error: "Brevo API not configured for this organization" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user ID from auth header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const results: { email: string; status: string; error?: string }[] = [];

    for (const recipient of recipients) {
      try {
        const variables: Record<string, string> = {
          nome: recipient.name || '',
          email: recipient.email || '',
          organizacao: org.name || '',
          data: formatDate(),
          ...recipient.variables,
        };

        const subject = replaceVariables(templateSubject, variables);
        let htmlContent = replaceVariables(templateHtmlContent, variables);

        // Apply campaign settings to HTML
        htmlContent = applyHtmlSettings(htmlContent, settings, settingsData);

        // Build Brevo payload
        const toName = settings.customize_to && recipient.variables?.empresa
          ? `${recipient.name} - ${recipient.variables.empresa}`
          : (recipient.name || recipient.email);

        const brevoPayload: Record<string, unknown> = {
          sender: { name: org.name, email: org.brevo_sender_email },
          to: [{ email: recipient.email, name: toName }],
          subject,
          htmlContent,
        };

        // Reply-to
        if (settings.different_reply_to && settingsData.different_reply_to) {
          brevoPayload.replyTo = { email: settingsData.different_reply_to };
        }

        // Tags
        if (settings.tag && settingsData.tag) {
          brevoPayload.tags = [settingsData.tag];
        }

        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": org.brevo_api_key,
            "content-type": "application/json",
          },
          body: JSON.stringify(brevoPayload),
        });

        const status = brevoResponse.ok ? "sent" : "failed";
        const errorMessage = brevoResponse.ok ? null : await brevoResponse.text();

        let brevoMessageId: string | null = null;
        if (brevoResponse.ok) {
          try {
            const brevoData = await brevoResponse.json();
            brevoMessageId = brevoData.messageId || null;
          } catch { /* ignore */ }
        }

        const emailSendRecord = {
          organization_id: organizationId,
          template_id: templateId || null,
          campaign_id: campaignId || null,
          client_id: recipient.clientId || null,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          subject,
          status,
          error_message: errorMessage,
          sent_at: status === "sent" ? new Date().toISOString() : null,
          sent_by: userId,
          brevo_message_id: brevoMessageId,
        };

        const { error: insertError } = await supabase.from("email_sends").insert(emailSendRecord);
        
        // Fallback: if insert fails (e.g. FK constraint on client_id), retry without client_id
        if (insertError) {
          console.warn(`Insert failed for ${recipient.email}, retrying without client_id:`, insertError.message);
          await supabase.from("email_sends").insert({ ...emailSendRecord, client_id: null });
        }

        results.push({ email: recipient.email, status, error: errorMessage || undefined });
        console.log(`Email to ${recipient.email}: ${status}`);
      } catch (recipientError) {
        const errorMsg = recipientError instanceof Error ? recipientError.message : "Unknown error";
        console.error(`Failed to send to ${recipient.email}:`, errorMsg);

        const failRecord = {
          organization_id: organizationId,
          template_id: templateId || null,
          campaign_id: campaignId || null,
          client_id: recipient.clientId || null,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          subject: templateSubject,
          status: "failed",
          error_message: errorMsg,
          sent_by: userId,
        };

        const { error: failInsertError } = await supabase.from("email_sends").insert(failRecord);
        if (failInsertError) {
          console.warn(`Fail record insert failed for ${recipient.email}, retrying without client_id`);
          await supabase.from("email_sends").insert({ ...failRecord, client_id: null });
        }

        results.push({ email: recipient.email, status: "failed", error: errorMsg });
      }
    }

    const successful = results.filter(r => r.status === "sent").length;
    const failed = results.filter(r => r.status === "failed").length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: { total: recipients.length, sent: successful, failed },
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-template-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
