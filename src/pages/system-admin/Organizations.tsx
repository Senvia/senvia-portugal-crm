import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AdminShell, AdminTableSkeleton } from "@/components/system-admin/AdminShell";

interface OrgWithMeta {
  id: string;
  name: string;
  slug: string;
  code: string | null;
  plan: string | null;
  trial_ends_at: string | null;
  billing_exempt: boolean | null;
  created_at: string | null;
  member_count: number;
  created_by_email: string | null;
}

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter",
  pro: "Pro",
  elite: "Elite",
};

function formatDate(date: string | null): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy", { locale: pt });
}

export default function SystemAdminOrganizations() {
  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["super-admin-orgs-list"],
    queryFn: async (): Promise<OrgWithMeta[]> => {
      const { data: orgs, error } = await supabase
        .from("organizations")
        .select("id, name, slug, code, plan, trial_ends_at, billing_exempt, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: members, error: mErr } = await supabase
        .from("organization_members")
        .select("organization_id, user_id, role");
      if (mErr) throw mErr;

      const counts: Record<string, number> = {};
      const createdBy: Record<string, string | null> = {};
      (members || []).forEach((m: any) => {
        counts[m.organization_id] = (counts[m.organization_id] || 0) + 1;
        if (m.role === "admin" && !createdBy[m.organization_id]) {
          createdBy[m.organization_id] = m.user_id;
        }
      });

      const userIds = Object.values(createdBy).filter(Boolean) as string[];
      const emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", userIds);
        (profiles || []).forEach((p: any) => {
          emailMap[p.id] = p.email;
        });
      }

      return (orgs || []).map((o) => ({
        ...o,
        member_count: counts[o.id] || 0,
        created_by_email: createdBy[o.id] ? emailMap[createdBy[o.id]!] : null,
      }));
    },
  });

  return (
    <AdminShell
      title="Organizações"
      description={isLoading ? "A carregar..." : `${orgs.length} organizações registadas`}
      icon={Building2}
      maxWidth="5xl"
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Lista de Organizações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <AdminTableSkeleton rows={8} cols={5} />
          ) : orgs.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Ainda não há organizações registadas.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organização</TableHead>
                    <TableHead className="hidden sm:table-cell">Código</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead className="hidden md:table-cell">Membros</TableHead>
                    <TableHead className="hidden lg:table-cell">Admin</TableHead>
                    <TableHead className="hidden md:table-cell">Criada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{org.name}</span>
                          <span className="text-xs text-muted-foreground">{org.slug}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                          {org.code || "—"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "border-transparent",
                            org.plan && PLAN_LABELS[org.plan]
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {PLAN_LABELS[org.plan || ""] || "Sem plano"}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {org.member_count}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">{org.created_by_email || "—"}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(org.created_at)}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
