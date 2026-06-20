import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

// Lightweight read of the org's onboarding progress for the chat UI + nav badge.
// Mirrors the checks the otto edge function computes, but cheap (a few small
// counts). Degrades gracefully if the org_onboarding_state table is absent.
export interface OttoOnboardingStatus {
  loading: boolean;
  completed: boolean;
  dismissed: boolean;
  showBadge: boolean;
  steps: { key: string; label: string; done: boolean }[];
  progress: { done: number; total: number };
}

const STEP_LABELS: { key: string; label: string }[] = [
  { key: "company_info", label: "Dados da empresa" },
  { key: "invoicing", label: "Faturação" },
  { key: "integrations", label: "Integrações" },
  { key: "pipeline", label: "Pipeline" },
  { key: "team", label: "Equipa" },
  { key: "leads", label: "Leads" },
];

export function useOttoOnboarding(): OttoOnboardingStatus {
  const { organization } = useAuth();
  const { isAdmin } = usePermissions();
  const orgId = organization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["otto-onboarding", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async () => {
      // Stored state (may not exist yet).
      let stored: { completed_at: string | null; dismissed: boolean } | null = null;
      try {
        // Cast: org_onboarding_state is a new table not yet in the generated
        // Supabase types. Regenerate types after the migration to drop the cast.
        const { data: row } = await (supabase as any)
          .from("org_onboarding_state")
          .select("completed_at, dismissed")
          .eq("organization_id", orgId!)
          .maybeSingle();
        stored = row as any;
      } catch { /* table may not exist yet */ }

      // Real checks.
      const [stagesRes, leadsRes, membersRes, orgRes] = await Promise.all([
        supabase.from("pipeline_stages").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", orgId!),
        supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", orgId!).eq("is_active", true),
        supabase.from("organizations").select("contact_phone, invoicexpress_api_key, keyinvoice_username, brevo_api_key").eq("id", orgId!).maybeSingle(),
      ]);

      const org = orgRes.data as any;
      const checks: Record<string, boolean> = {
        company_info: !!org?.contact_phone,
        invoicing: !!(org?.invoicexpress_api_key || org?.keyinvoice_username),
        integrations: !!org?.brevo_api_key,
        pipeline: (stagesRes.count ?? 0) > 0,
        team: (membersRes.count ?? 0) > 1,
        leads: (leadsRes.count ?? 0) > 0,
      };
      return { stored, checks };
    },
  });

  const checks = data?.checks ?? {};
  const steps = STEP_LABELS.map((s) => ({ ...s, done: !!checks[s.key] }));
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = steps.length > 0 && doneCount === steps.length;
  const completed = !!data?.stored?.completed_at || allDone;
  const dismissed = !!data?.stored?.dismissed;

  return {
    loading: isLoading,
    completed,
    dismissed,
    // Nudge admins who still have setup pending and haven't dismissed/finished.
    showBadge: !!orgId && isAdmin && !completed && !dismissed && !isLoading,
    steps,
    progress: { done: doneCount, total: steps.length },
  };
}
