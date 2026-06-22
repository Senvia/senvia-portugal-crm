import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

// The 8 activation modules. "Completed" is DERIVED from real signals, never from
// clicks in Otto, so the badge self-heals if the user does things outside the chat.
export type ActivationModuleKey =
  | "leads" | "clients" | "sales" | "proposals"
  | "finance" | "integrations" | "inbox" | "team";

export const ACTIVATION_MODULE_ORDER: ActivationModuleKey[] = [
  "leads", "clients", "sales", "proposals",
  "finance", "integrations", "inbox", "team",
];

// Fase 1 ships peek bubbles only for the value path. The badge still counts all 8.
export const PHASE1_MODULES: ActivationModuleKey[] = ["leads", "clients", "sales", "proposals"];

// Maps an app route to the activation module it represents (for the peek).
export const ROUTE_TO_MODULE: Record<string, ActivationModuleKey> = {
  "/leads": "leads",
  "/clients": "clients",
  "/sales": "sales",
  "/proposals": "proposals",
};

export interface ActivationProgress {
  loading: boolean;
  isAdmin: boolean;
  signals: Record<ActivationModuleKey, boolean>;
  done: number;
  total: number;
}

// Reads the live activation signals for the active org. Fresh (react-query) so it
// reflects data created outside Otto. Cheap: a handful of head/count queries.
export function useActivationProgress(): ActivationProgress {
  const { organization } = useAuth();
  const { isAdmin } = usePermissions();
  const orgId = organization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["activation-progress", orgId],
    enabled: !!orgId,
    staleTime: 30_000,
    queryFn: async (): Promise<Record<ActivationModuleKey, boolean>> => {
      const [orgRes, membersRes, channelsRes] = await Promise.all([
        // Cast: first_*_at columns are newer than the generated types.
        (supabase as any)
          .from("organizations")
          .select(
            "first_lead_at, first_client_at, first_sale_at, first_proposal_at, billing_provider, invoicexpress_api_key, keyinvoice_username, brevo_api_key, integrations_enabled, whatsapp_instance",
          )
          .eq("id", orgId!)
          .maybeSingle(),
        supabase
          .from("organization_members")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId!)
          .eq("is_active", true),
        supabase
          .from("messaging_channels")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId!)
          .eq("status", "connected"),
      ]);

      const o = (orgRes.data ?? {}) as any;
      const integrationsEnabled =
        o.integrations_enabled && typeof o.integrations_enabled === "object"
          ? Object.values(o.integrations_enabled).some(Boolean)
          : false;

      return {
        leads: !!o.first_lead_at,
        clients: !!o.first_client_at,
        sales: !!o.first_sale_at,
        proposals: !!o.first_proposal_at,
        finance: !!(o.billing_provider || o.invoicexpress_api_key || o.keyinvoice_username),
        integrations: !!o.brevo_api_key || integrationsEnabled,
        inbox: (channelsRes.count ?? 0) > 0 || !!o.whatsapp_instance,
        team: (membersRes.count ?? 0) > 1,
      };
    },
  });

  const empty: Record<ActivationModuleKey, boolean> = {
    leads: false, clients: false, sales: false, proposals: false,
    finance: false, integrations: false, inbox: false, team: false,
  };
  const signals = data ?? empty;
  const done = ACTIVATION_MODULE_ORDER.reduce((n, k) => n + (signals[k] ? 1 : 0), 0);

  return {
    loading: isLoading,
    isAdmin,
    signals,
    done,
    total: ACTIVATION_MODULE_ORDER.length,
  };
}

// Reads + writes the per-module dismissal map stored in org_onboarding_state.
function useModuleDismissals() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-module-dismissed", orgId],
    enabled: !!orgId,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, string | null>> => {
      // Cast: module_dismissed is newer than the generated types.
      const { data, error } = await (supabase as any)
        .from("org_onboarding_state")
        .select("module_dismissed")
        .eq("organization_id", orgId!)
        .maybeSingle();
      if (error) throw error;
      return ((data?.module_dismissed as Record<string, string | null>) ?? {});
    },
  });

  const dismiss = useMutation({
    mutationFn: async (moduleKey: ActivationModuleKey) => {
      if (!orgId) return;
      const next = { ...(data ?? {}), [moduleKey]: new Date().toISOString() };
      const { error } = await (supabase as any)
        .from("org_onboarding_state")
        .upsert(
          { organization_id: orgId, module_dismissed: next, updated_at: new Date().toISOString() },
          { onConflict: "organization_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-module-dismissed", orgId] });
    },
  });

  return { dismissed: data ?? {}, loading: isLoading, dismiss: dismiss.mutate };
}

export interface ModuleOnboarding {
  shouldShow: boolean;
  dismiss: () => void;
}

// Decides whether a module's peek bubble should appear, and how to dismiss it.
// Shows when: admin, the module is not yet completed (real signal false), and the
// user has not dismissed it before. Completion/dismissal are both persistent.
export function useModuleOnboarding(moduleKey: ActivationModuleKey | null): ModuleOnboarding {
  const { signals, isAdmin, loading: progressLoading } = useActivationProgress();
  const { dismissed, loading: dismissLoading, dismiss } = useModuleDismissals();

  const shouldShow =
    !!moduleKey &&
    isAdmin &&
    !progressLoading &&
    !dismissLoading &&
    !signals[moduleKey] &&
    !dismissed[moduleKey];

  return {
    shouldShow,
    dismiss: () => moduleKey && dismiss(moduleKey),
  };
}
