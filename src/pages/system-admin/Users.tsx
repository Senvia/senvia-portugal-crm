import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, ArrowLeft, ChevronRight, Calendar, Mail, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

interface OrgMemberWithProfile {
  organization_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  org_name: string;
  profile: UserProfile | null;
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return format(new Date(date), "dd MMM yyyy", { locale: pt });
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  member: "Membro",
  super_admin: "Super Admin",
};

export default function SystemAdminUsers() {
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["super-admin-users"],
    queryFn: async (): Promise<OrgMemberWithProfile[]> => {
      // Get all members
      const { data: members, error } = await supabase
        .from("organization_members")
        .select("organization_id, user_id, role, is_active")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Get org names
      const orgIds = [...new Set((members || []).map((m) => m.organization_id))];
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id, name")
        .in("id", orgIds);
      const orgNames = new Map((orgs || []).map((o) => [o.id, o.name]));

      // Get profiles
      const userIds = [...new Set((members || []).map((m) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, display_name, avatar_url, created_at")
        .in("id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

      return (members || []).map((m: any) => ({
        organization_id: m.organization_id,
        user_id: m.user_id,
        role: m.role,
        is_active: m.is_active,
        org_name: orgNames.get(m.organization_id) || "—",
        profile: profileMap.get(m.user_id) || null,
      }));
    },
  });

  return (
    <div className="min-h-dvh bg-background p-4 lg:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/system-admin"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="space-y-1">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Users className="h-5 w-5 shrink-0 text-primary" />
              Utilizadores
            </h1>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "A carregar..." : `${users.length} membros em organizações`}
            </p>
          </div>
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Membros por Organização</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : users.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">Nenhum utilizador encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilizador</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Organização</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead className="hidden md:table-cell">Estado</TableHead>
                      <TableHead className="hidden lg:table-cell">Registo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={`${u.user_id}-${u.organization_id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                              {(u.profile?.display_name || u.profile?.email || "?")[0].toUpperCase()}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">
                                {u.profile?.display_name || "Sem nome"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {u.profile?.id.slice(0, 8)}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {u.profile?.email || "—"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{u.org_name}</span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              u.role === "admin" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                              u.role === "super_admin" && "bg-primary/10 text-primary",
                              u.role === "member" && "bg-muted text-muted-foreground",
                            )}
                          >
                            {ROLE_LABELS[u.role] || u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            {u.is_active ? (
                              <>
                                <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                                <span className="text-sm text-emerald-600 dark:text-emerald-400">Ativo</span>
                              </>
                            ) : (
                              <>
                                <UserX className="h-3.5 w-3.5 text-destructive" />
                                <span className="text-sm text-destructive">Inativo</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {u.profile?.created_at ? formatDate(u.profile.created_at) : "—"}
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

        {/* Back */}
        <div className="border-t border-border pt-4">
          <Link
            to="/system-admin"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronRight className="h-3.5 w-3.5 -rotate-180" />
            Voltar ao Painel Super Admin
          </Link>
        </div>
      </div>
    </div>
  );
}
