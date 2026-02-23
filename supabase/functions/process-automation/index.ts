import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutomationEvent {
  trigger_type: string;
  organization_id: string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { trigger_type, organization_id, record, old_record }: AutomationEvent = await req.json();

    if (!trigger_type || !organization_id || !record) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing automation: ${trigger_type} for org ${organization_id}`);

    // Find active automations for this trigger
    const { data: automations, error: automError } = await supabase
      .from("email_automations")
      .select("*, email_templates(*)")
      .eq("organization_id", organization_id)
      .eq("trigger_type", trigger_type)
      .eq("is_active", true);

    if (automError) {
      console.error("Error fetching automations:", automError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch automations" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!automations || automations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active automations for this trigger" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let triggered = 0;

    for (const automation of automations) {
      // Check trigger_config conditions
      if (!matchesTriggerConfig(automation.trigger_config, record, old_record)) {
        continue;
      }

      // Resolve recipient email/name
      const recipient = resolveRecipient(automation.recipient_type, record);
      if (!recipient || !recipient.email) {
        console.warn(`No recipient resolved for automation ${automation.id}`);
        continue;
      }

      // Build variables
      const variables: Record<string, string> = {
        nome: recipient.name || '',
        email: recipient.email || '',
        data: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }),
      };

      // Add record fields as variables
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string' || typeof value === 'number') {
          variables[key] = String(value);
        }
      }

      if (automation.delay_minutes > 0) {
        // Schedule for later
        const scheduledFor = new Date(Date.now() + automation.delay_minutes * 60 * 1000);
        await supabase.from("automation_queue").insert({
          automation_id: automation.id,
          organization_id,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          variables,
          template_id: automation.template_id,
          scheduled_for: scheduledFor.toISOString(),
          status: "pending",
        });
        console.log(`Queued automation ${automation.id} for ${scheduledFor.toISOString()}`);
      } else {
        // Send immediately via send-template-email
        const { error: sendError } = await supabase.functions.invoke("send-template-email", {
          body: {
            organizationId: organization_id,
            templateId: automation.template_id,
            recipients: [{
              email: recipient.email,
              name: recipient.name || '',
              variables,
            }],
          },
        });

        if (sendError) {
          console.error(`Failed to send automation ${automation.id}:`, sendError);
        } else {
          console.log(`Sent automation ${automation.id} to ${recipient.email}`);
        }
      }

      // Update automation stats
      await supabase
        .from("email_automations")
        .update({
          last_triggered_at: new Date().toISOString(),
          total_triggered: (automation.total_triggered || 0) + 1,
        })
        .eq("id", automation.id);

      triggered++;
    }

    return new Response(
      JSON.stringify({ success: true, triggered }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-automation:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function matchesTriggerConfig(
  config: Record<string, unknown> | null,
  record: Record<string, unknown>,
  oldRecord?: Record<string, unknown>
): boolean {
  if (!config || Object.keys(config).length === 0) return true;

  // For status change triggers
  if (config.to_status && record.status !== config.to_status) return false;
  if (config.from_status && oldRecord && oldRecord.status !== config.from_status) return false;

  return true;
}

function resolveRecipient(
  recipientType: string,
  record: Record<string, unknown>
): { email: string | null; name: string | null } {
  switch (recipientType) {
    case 'lead':
      return { email: record.email as string, name: record.name as string };
    case 'client':
      return { email: record.email as string, name: record.name as string };
    default:
      return { email: record.email as string, name: record.name as string };
  }
}
