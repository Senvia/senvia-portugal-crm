import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Building2 } from "lucide-react";

export default function SystemAdminOrganizations() {
  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/system-admin"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Building2 className="h-5 w-5 shrink-0 text-primary" />
              Organizações
            </h1>
            <p className="text-sm text-muted-foreground">Criar e gerir organizações.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Organizações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Funcionalidade em desenvolvimento.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
