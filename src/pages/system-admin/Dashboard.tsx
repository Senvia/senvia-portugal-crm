import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Activity, Users, Sparkles, MessageCircle } from "lucide-react";
import { AdminOverview } from "@/components/system-admin/AdminOverview";
import { OrganizationsTable } from "@/components/system-admin/OrganizationsTable";
import type { OrgStripeData, AdminContact } from "@/components/system-admin/OrganizationsTable";

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  billing_exempt: boolean | null;
  created_at: string | null;
  contact_phone: string | null;
  first_paid_at: string | null;
  current_period_end: string | null;
  payment_failed_at: string | null;
  last_active_at: string | null;
  extra_seats: number | null;
}

interface OrgWithMembers extends OrgRow {
  member_count: number;
}

interface StripeStatsResponse {
  mrr: number;
  paying_count: number;
  total_subscriptions: number;
  org_stats: OrgStripeData[];
}

const SECONDARY = [
  { to: "/system-admin/activation", icon: Activity, label: "Ativação" },
  { to: "/system-admin/trial-whatsapp", icon: MessageCircle, label: "WhatsApp" },
  { to: "/system-admin/users", icon: Users, label: "Utilizadores" },
  { to: "/system-admin/announcements", icon: Sparkles, label: "Novidades" },
];

export default function SystemAdminDashboard() {
  const { switchOrganization, organization } = useAuth();

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["super-admin-all-orgs"],
    queryFn: async (): Promise<OrgWithMembers[]> => {
      // Cast: last_active_at is newer than the generated types.
      const { data: orgs, error } = await (supabase as any)
        .from("organizations")
        .select("id, name, slug, code, plan, trial_ends_at, billing_exempt, created_at, contact_phone, first_paid_at, current_period_end, payment_failed_at, last_active_at, extra_seats")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: members, error: mErr } = await supabase
        .from("organization_members")
        .select("organization_id");
      if (mErr) throw mErr;

      const counts: Record<string, number> = {};
      (members || []).forEach((m) => {
        counts[m.organization_id] = (counts[m.organization_id] || 0) + 1;
      });

      // Fold the latest member login into "última atividade" so an account that
      // is USED (logins, admin work) but doesn't create new entities isn't shown
      // as dead. The stored last_active_at stays creation-only for the activation
      // funnel; this GREATEST is display-only. Non-fatal if the RPC is unavailable.
      const loginMap: Record<string, string> = {};
      try {
        const { data: logins } = await (supabase as any).rpc("admin_org_last_sign_in");
        (logins || []).forEach((r: any) => {
          if (r.org_id && r.last_login) loginMap[r.org_id] = r.last_login;
        });
      } catch { /* fall back to last_active_at */ }

      return (orgs || []).map((o: any) => {
        const candidates = [o.last_active_at, loginMap[o.id]].filter(Boolean) as string[];
        const lastActive = candidates.length ? candidates.sort().pop()! : o.last_active_at;
        return { ...o, last_active_at: lastActive, member_count: counts[o.id] || 0 };
      });
    },
  });

  const { data: adminInfo = {} } = useQuery({
    queryKey: ["super-admin-admin-info"],
    queryFn: async (): Promise<Record<string, AdminContact>> => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id, user_id, role")
        .eq("role", "admin")
        .eq("is_active", true);
      if (error) throw error;

      const adminUserIds = (data || []).map((m: any) => m.user_id);
      if (adminUserIds.length === 0) return {};

      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", adminUserIds);
      if (pErr) throw pErr;

      const profMap: Record<string, AdminContact> = {};
      (profiles || []).forEach((p: any) => {
        profMap[p.id] = { name: p.full_name || undefined, email: p.email || undefined };
      });

      const orgAdminMap: Record<string, AdminContact> = {};
      (data || []).forEach((m: any) => {
        if (!orgAdminMap[m.organization_id] && profMap[m.user_id]) {
          orgAdminMap[m.organization_id] = profMap[m.user_id];
        }
      });
      return orgAdminMap;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: stripeStats } = useQuery({
    queryKey: ["super-admin-stripe-stats"],
    queryFn: async (): Promise<StripeStatsResponse> => {
      const { data, error } = await supabase.functions.invoke("admin-stripe-stats");
      if (error) throw error;
      return data as StripeStatsResponse;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
        {/* Header */}
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Visão geral</h1>
            <p className="mt-1 text-sm text-muted-foreground">Assinaturas, receita e clientes do Senvia OS.</p>
          </div>
          <nav className="flex items-center gap-1">
            {SECONDARY.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <s.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </Link>
            ))}
          </nav>
        </header>

        {/* Overview: metrics + chart + subscription status */}
        <AdminOverview organizations={organizations} stripeStats={stripeStats} loading={isLoading} />

        {/* Clients */}
        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-medium text-foreground/70">Clientes</h2>
          <OrganizationsTable
            organizations={organizations}
            loading={isLoading}
            currentOrgId={organization?.id}
            onAccessOrg={(id) => switchOrganization(id)}
            stripeData={stripeStats?.org_stats}
            adminInfo={adminInfo}
          />
        </section>
      </div>
    </div>
  );
}
