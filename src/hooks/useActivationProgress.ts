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

// Routes that trigger a module peek, in priority order per route prefix. Settings
// hosts two setup areas (integrations + team), so it lists both and the first one
// not yet done is offered. /marketing runs on the integrations (Brevo) signal,
// since email marketing needs Brevo connected.
const PEEK_CANDIDATES: Array<{ prefix: string; modules: ActivationModuleKey[] }> = [
  { prefix: "/leads", modules: ["leads"] },
  { prefix: "/clients", modules: ["clients"] },
  { prefix: "/sales", modules: ["sales"] },
  { prefix: "/proposals", modules: ["proposals"] },
  { prefix: "/financeiro", modules: ["finance"] },
  { prefix: "/inbox", modules: ["inbox"] },
  { prefix: "/marketing", modules: ["integrations"] },
  { prefix: "/settings", modules: ["integrations", "team"] },
];

function candidatesForPath(pathname: string): ActivationModuleKey[] {
  for (const { prefix, modules } of PEEK_CANDIDATES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return modules;
  }
  return [];
}

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

export interface OnboardingPeek {
  moduleKey: ActivationModuleKey | null;
  shouldShow: boolean;
  dismiss: () => void;
}

// Resolves which module peek (if any) to show for the current route, derived from
// real signals + per-module dismissals. For a route hosting multiple setup areas
// (e.g. /settings), offers the first one not yet completed and not dismissed.
// Shows only for admins. Completion and dismissal are both persistent.
export function useOnboardingPeek(pathname: string): OnboardingPeek {
  const { signals, isAdmin, loading: progressLoading } = useActivationProgress();
  const { dismissed, loading: dismissLoading, dismiss } = useModuleDismissals();

  const candidates = candidatesForPath(pathname);
  const moduleKey = candidates.find((m) => !signals[m] && !dismissed[m]) ?? null;

  const shouldShow = !!moduleKey && isAdmin && !progressLoading && !dismissLoading;

  return {
    moduleKey,
    shouldShow,
    dismiss: () => moduleKey && dismiss(moduleKey),
  };
}
