import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Users, BarChart3, Plus, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrganizationWithStats {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  organization_code: string | null;
  member_count: number;
}

export default function SystemAdminDashboard() {
  const { switchOrganization, organization } = useAuth();

  // Fetch all organizations for super admin quick access
  const { data: allOrganizations = [], isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['all-organizations-admin'],
    queryFn: async (): Promise<OrganizationWithStats[]> => {
      const { data, error } = await supabase.rpc('get_all_organizations');
      if (error) throw error;
      return (data || []) as OrganizationWithStats[];
    },
  });

  // Count stats
  const { data: stats } = useQuery({
    queryKey: ['super-admin-stats'],
    queryFn: async () => {
      const [orgsCount, leadsCount] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('leads').select('id', { count: 'exact', head: true }),
      ]);
      return {
        organizations: orgsCount.count || 0,
        leads: leadsCount.count || 0,
      };
    },
  });

  const handleSupportAccess = async (orgId: string) => {
    await switchOrganization(orgId);
  };

  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 lg:mb-8">
          <h1 className="text-xl lg:text-2xl font-bold">Painel Super Admin</h1>
          <p className="text-sm text-muted-foreground">Gestão global do sistema Senvia OS.</p>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 lg:mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Organizações</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold">{stats?.organizations || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium">Total de Leads</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl lg:text-2xl font-bold">{stats?.leads || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access to Organizations */}
        <Card className="mb-6 lg:mb-8">
          <CardHeader>
            <CardTitle className="text-base lg:text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              Acesso Rápido a Organizações
            </CardTitle>
            <p className="text-xs lg:text-sm text-muted-foreground">
              Entra em qualquer organização para dar suporte ao cliente.
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingOrgs ? (
              <div className="text-sm text-muted-foreground">A carregar...</div>
            ) : allOrganizations.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma organização encontrada.</div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {allOrganizations.map((org) => (
                  <Button
                    key={org.organization_id}
                    variant={organization?.id === org.organization_id ? "default" : "outline"}
                    className="w-full justify-start h-auto py-3 px-4"
                    onClick={() => handleSupportAccess(org.organization_id)}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <LogIn className="h-4 w-4 shrink-0" />
                      <div className="flex flex-col items-start text-left min-w-0">
                        <span className="font-medium truncate w-full">{org.organization_name}</span>
                        <span className="text-xs opacity-70">{org.organization_slug} • {org.member_count} membros</span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link to="/system-admin/organizations">
              <Plus className="h-4 w-4 mr-2" />
              Gerir Organizações
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/system-admin/users">
              <Users className="h-4 w-4 mr-2" />
              Gerir Utilizadores
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">← Voltar ao Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
