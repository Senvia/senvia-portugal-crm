// Onboarding state machine. Otto walks a new org through setup in this order.
// Each stage has a `check` derived from REAL data (not just a stored flag), so
// the flow self-heals if the user configures something outside the chat.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import type { OnboardingState, OrgInfo } from "./types.ts";

export const ONBOARDING_ORDER = [
  "WELCOME",
  "COMPANY_INFO",
  "INVOICING",
  "INTEGRATIONS",
  "PIPELINE",
  "TEAM",
  "LEADS_IMPORT",
  "COMPLETE",
] as const;

export const STAGE_LABELS: Record<string, string> = {
  WELCOME: "Boas-vindas",
  COMPANY_INFO: "Dados da empresa",
  INVOICING: "Faturação",
  INTEGRATIONS: "Integrações",
  PIPELINE: "Pipeline",
  TEAM: "Equipa",
  LEADS_IMPORT: "Importar leads",
  COMPLETE: "Concluído",
};

// Compute the real configuration state of the org from live data. Cheap, single
// round of small queries. Falls back gracefully if a table is missing.
export async function computeOnboardingState(
  admin: SupabaseClient,
  org: OrgInfo,
): Promise<OnboardingState> {
  const orgId = org.id;

  // Run the independent checks together.
  const [stagesRes, leadsRes, membersRes] = await Promise.all([
    admin.from("pipeline_stages").select("id").eq("organization_id", orgId).limit(1),
    admin.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    admin.from("organization_members").select("id", { count: "exact", head: true })
      .eq("organization_id", orgId).eq("is_active", true),
  ]);

  // Company info: a name beyond the default plus at least a contact phone.
  const company_info = !!(org.name && org.name.trim().length > 0);

  // Invoicing: a provider key is present.
  const { data: orgCfg } = await admin
    .from("organizations")
    .select("billing_provider, invoicexpress_api_key, keyinvoice_username, brevo_api_key, contact_phone, niche, logo_url")
    .eq("id", orgId)
    .maybeSingle();

  const invoicing = !!(orgCfg?.invoicexpress_api_key || orgCfg?.keyinvoice_username);
  const integrations = !!orgCfg?.brevo_api_key;
  const pipeline = (stagesRes.data?.length ?? 0) > 0;
  const team = (membersRes.count ?? 0) > 1;
  const leads = (leadsRes.count ?? 0) > 0;
  const company_full = company_info && !!orgCfg?.contact_phone;

  const checks = {
    company_info: company_full,
    invoicing,
    integrations,
    pipeline,
    team,
    leads,
  };

  // Read the stored row (may not exist). It carries dismissal + completion.
  let stored: { current_stage: string; stages_completed: string[]; dismissed: boolean; completed_at: string | null } | null = null;
  try {
    const { data } = await admin
      .from("org_onboarding_state")
      .select("current_stage, stages_completed, dismissed, completed_at")
      .eq("organization_id", orgId)
      .maybeSingle();
    stored = data as any;
  } catch { /* table may not exist yet — degrade gracefully */ }

  // Derive the current stage from the first incomplete real check.
  const stageCheck: Record<string, boolean> = {
    COMPANY_INFO: checks.company_info,
    INVOICING: checks.invoicing,
    INTEGRATIONS: checks.integrations,
    PIPELINE: checks.pipeline,
    TEAM: checks.team,
    LEADS_IMPORT: checks.leads,
  };
  let derivedStage = "COMPLETE";
  for (const stage of ["COMPANY_INFO", "INVOICING", "INTEGRATIONS", "PIPELINE", "TEAM", "LEADS_IMPORT"]) {
    if (!stageCheck[stage]) { derivedStage = stage; break; }
  }

  const completed = !!stored?.completed_at || derivedStage === "COMPLETE";

  return {
    current_stage: stored?.current_stage && stored.current_stage !== "WELCOME"
      ? stored.current_stage
      : derivedStage,
    stages_completed: stored?.stages_completed ?? [],
    dismissed: stored?.dismissed ?? false,
    completed,
    checks,
  };
}

// Decide the operating mode: onboarding while the org is still in trial AND not
// finished setting up AND has not dismissed the assistant; support otherwise.
export function resolveMode(org: OrgInfo, state: OnboardingState): "support" | "onboarding" {
  if (state.dismissed || state.completed) return "support";
  const inTrial = !!org.trial_ends_at && new Date(org.trial_ends_at).getTime() > Date.now();
  // Treat a brand-new org (no plan yet) as in onboarding too.
  const newOrg = !org.plan || org.plan === "trial";
  return (inTrial || newOrg) ? "onboarding" : "support";
}
