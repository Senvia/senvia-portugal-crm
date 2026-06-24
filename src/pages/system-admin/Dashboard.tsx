import { Link } from "react-router-dom";
import { Activity, Building, Sparkles, Users, ShieldCheck, Search, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminMetricsCards } from "@/components/system-admin/AdminMetricsCards";
import { OrganizationsTable } from "@/components/system-admin/OrganizationsTable";
import type { OrgStripeData } from "@/components/system-admin/OrganizationsTable";
import { cn } from "@/lib/utils";

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

const QUICK_ACTIONS = [
  { to: "/system-admin/organizations", icon: Building, label: "Gerir Organizações", desc: "Consultar e editar organizações" },
  { to: "/system-admin/users", icon: Users, label: "Gerir Utilizadores", desc: "Gerir contas e permissões" },
  { to: "/system-admin/announcements", icon: Sparkles, label: "Gerir Novidades", desc: "Pop-ups de novidades do sistema" },
  { to: "/system-admin/activation", icon: Activity, label: "Ativação de Trials", desc: "Funil de conversão e ativação" },
];

export default function SystemAdminDashboard() {
  const { switchOrganization, organization } = useAuth();

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["super-admin-all-orgs"],
    queryFn: async (): Promise<OrgWithMembers[]> => {
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("id, name, slug, code, plan, trial_ends_at, billing_exempt, created_at, contact_phone")
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

      return (orgs || []).map((o) => ({
        ...o,
        member_count: counts[o.id] || 0,
      }));
    },
  });

  const { data: adminEmails = {} } = useQuery({
    queryKey: ["super-admin-admin-emails"],
    queryFn: async (): Promise<Record<string, string>> => {
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
        .select("id, email")
        .in("id", adminUserIds);
      if (pErr) throw pErr;

      const emailMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        if (p.email) emailMap[p.id] = p.email;
      });

      const orgAdminMap: Record<string, string> = {};
      (data || []).forEach((m: any) => {
        if (!orgAdminMap[m.organization_id] && emailMap[m.user_id]) {
          orgAdminMap[m.organization_id] = emailMap[m.user_id];
        }
      });
      return orgAdminMap;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: stripeStats, isLoading: stripeLoading } = useQuery({
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
    <div className="min-h-dvh bg-background p-4 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
              Painel Super Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestão global do sistema Senvia OS.
              {stripeStats && (
                <span className="ml-2 text-[11px] text-muted-foreground/60">
                  {stripeStats.paying_count} pagantes · €{stripeStats.mrr} MRR
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Métricas */}
        <AdminMetricsCards
          organizations={organizations}
          stripeStats={stripeStats ? { mrr: stripeStats.mrr, paying_count: stripeStats.paying_count, total_subscriptions: stripeStats.total_subscriptions } : null}
          stripeLoading={stripeLoading}
        />

        {/* Ações rápidas — hub de navegação */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Navegação
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_ACTIONS.map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className={cn(
                  "group flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3.5",
                  "transition-all duration-150 hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm",
                  "active:scale-[0.99]",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                    <action.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium leading-none text-card-foreground">
                      {action.label}
                    </p>
                    <p className="text-xs text-muted-foreground">{action.desc}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </div>
        </div>

        {/* Tabela de organizações */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <OrganizationsTable
            organizations={organizations}
            currentOrgId={organization?.id}
            onAccessOrg={(id) => switchOrganization(id)}
            stripeData={stripeStats?.org_stats}
            adminEmails={adminEmails}
          />
        )}

        {/* Voltar ao dashboard principal */}
        <div className="border-t border-border pt-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5 -rotate-180" />
            Voltar ao Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
