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
  templateId: string;
  recipients: Recipient[];
}

// Replace variables in content
function replaceVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    result = result.replace(regex, value || '');
  }
  return result;
}

// Format current date in Portuguese
function formatDate(): string {
  return new Date().toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organizationId, templateId, recipients }: SendTemplateRequest = await req.json();

    if (!organizationId || !templateId || !recipients || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch template
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

    // Fetch organization for Brevo config
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("name, brevo_api_key, brevo_sender_email")
      .eq("id", organizationId)
      .single();

    if (orgError || !org) {
      console.error("Organization not found:", orgError);
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

    // Get user ID from auth header for logging
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const results: { email: string; status: string; error?: string }[] = [];

    // Send to each recipient
    for (const recipient of recipients) {
      try {
        // Build variables for this recipient
        const variables: Record<string, string> = {
          nome: recipient.name || '',
          email: recipient.email || '',
          organizacao: org.name || '',
          data: formatDate(),
          ...recipient.variables,
        };

        // Replace variables in subject and content
        const subject = replaceVariables(template.subject, variables);
        const htmlContent = replaceVariables(template.html_content, variables);

        // Send via Brevo
        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": org.brevo_api_key,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender: {
              name: org.name,
              email: org.brevo_sender_email,
            },
            to: [
              {
                email: recipient.email,
                name: recipient.name || recipient.email,
              },
            ],
            subject: subject,
            htmlContent: htmlContent,
          }),
        });

        const status = brevoResponse.ok ? "sent" : "failed";
        const errorMessage = brevoResponse.ok ? null : await brevoResponse.text();

        // Log the send
        await supabase.from("email_sends").insert({
          organization_id: organizationId,
          template_id: templateId,
          client_id: recipient.clientId || null,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          subject: subject,
          status: status,
          error_message: errorMessage,
          sent_at: status === "sent" ? new Date().toISOString() : null,
          sent_by: userId,
        });

        results.push({
          email: recipient.email,
          status,
          error: errorMessage || undefined,
        });

        console.log(`Email to ${recipient.email}: ${status}`);
      } catch (recipientError) {
        const errorMsg = recipientError instanceof Error ? recipientError.message : "Unknown error";
        console.error(`Failed to send to ${recipient.email}:`, errorMsg);
        
        // Log failed send
        await supabase.from("email_sends").insert({
          organization_id: organizationId,
          template_id: templateId,
          client_id: recipient.clientId || null,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          subject: template.subject,
          status: "failed",
          error_message: errorMsg,
          sent_by: userId,
        });

        results.push({
          email: recipient.email,
          status: "failed",
          error: errorMsg,
        });
      }
    }

    const successful = results.filter(r => r.status === "sent").length;
    const failed = results.filter(r => r.status === "failed").length;

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: recipients.length,
          sent: successful,
          failed: failed,
        },
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in send-template-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
