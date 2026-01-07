import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building, Users, BarChart3, Plus } from "lucide-react";

export default function SystemAdminDashboard() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Painel Super Admin</h1>
          <p className="text-muted-foreground">Gestão global do sistema Senvia OS.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Organizações</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Utilizadores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">0</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-4">
          <Button asChild>
            <Link to="/system-admin/organizations">
              <Plus className="h-4 w-4 mr-2" />
              Gerir Organizações
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/system-admin/users">
              <Users className="h-4 w-4 mr-2" />
              Gerir Utilizadores
            </Link>
          </Button>
          <Button variant="ghost" asChild>
            <Link to="/dashboard">← Voltar ao Dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
