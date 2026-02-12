import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { User, Building, Loader2, Save, Copy, Check } from "lucide-react";
import { PLAN_LABELS, OrganizationPlan } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface GeneralContentProps {
  organization: {
    id: string;
    name: string;
    plan: string | null;
    slug?: string;
  } | null;
  profile: {
    full_name: string;
  } | null;
  isAdmin: boolean;
  orgName: string;
  setOrgName: (value: string) => void;
  fullName: string;
  setFullName: (value: string) => void;
  handleSaveOrgName: () => void;
  handleSaveProfile: () => void;
  updateOrganizationIsPending: boolean;
  updateProfileIsPending: boolean;
}

export const GeneralContent = ({
  organization,
  profile,
  isAdmin,
  orgName,
  setOrgName,
  fullName,
  setFullName,
  handleSaveOrgName,
  handleSaveProfile,
  updateOrganizationIsPending,
  updateProfileIsPending,
}: GeneralContentProps) => {
  const { toast } = useToast();
  const [copiedSlug, setCopiedSlug] = useState(false);

  const handleCopySlug = async () => {
    if (!organization?.slug) return;
    try {
      await navigator.clipboard.writeText(organization.slug);
      setCopiedSlug(true);
      toast({ title: 'Copiado!', description: 'Código da empresa copiado para a área de transferência.' });
      setTimeout(() => setCopiedSlug(false), 2000);
    } catch (err) {
      toast({ title: 'Erro', description: 'Não foi possível copiar.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Organização</CardTitle>
          <CardDescription>Informações da sua organização.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Nome</Label>
              {isAdmin ? (
                <div className="flex gap-2">
                  <Input
                    id="org-name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Nome da organização"
                  />
                  <Button
                    size="icon"
                    onClick={handleSaveOrgName}
                    disabled={updateOrganizationIsPending || orgName === organization?.name}
                  >
                    {updateOrganizationIsPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <p className="text-foreground font-medium">{organization?.name || '-'}</p>
              )}
            </div>
            <div>
              <Label>Plano</Label>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={organization?.plan === 'pro' ? 'default' : 'secondary'}>
                  {organization?.plan ? PLAN_LABELS[organization.plan as OrganizationPlan] : 'Básico'}
                </Badge>
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2">
            <Label htmlFor="org-slug">Código da Empresa</Label>
            <div className="flex gap-2">
              <Input
                id="org-slug"
                value={organization?.slug || ''}
                readOnly
                className="bg-muted font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopySlug}
                disabled={!organization?.slug}
              >
                {copiedSlug ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Partilhe este código para convidar membros para a sua empresa.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />A Minha Conta</CardTitle>
          <CardDescription>Edite as suas informações pessoais.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="full-name">Nome Completo</Label>
            <div className="flex gap-2">
              <Input
                id="full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="O seu nome"
              />
              <Button
                size="icon"
                onClick={handleSaveProfile}
                disabled={updateProfileIsPending || fullName === profile?.full_name}
              >
                {updateProfileIsPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />GDPR</CardTitle>
          <CardDescription>Informações sobre proteção de dados.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Todos os leads registados nesta plataforma consentiram explicitamente o tratamento dos seus dados pessoais para fins comerciais, conforme exigido pelo RGPD. Os dados são armazenados de forma segura e podem ser eliminados a pedido do titular.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
