import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { User, Building, Loader2, Eye, EyeOff, Save, Key, Bell, BellOff } from "lucide-react";
import { PLAN_LABELS, OrganizationPlan } from "@/types";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

interface GeneralContentProps {
  organization: {
    id: string;
    name: string;
    plan: string | null;
  } | null;
  profile: {
    full_name: string;
  } | null;
  isAdmin: boolean;
  orgName: string;
  setOrgName: (value: string) => void;
  fullName: string;
  setFullName: (value: string) => void;
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  handleSaveOrgName: () => void;
  handleSaveProfile: () => void;
  handleChangePassword: () => void;
  updateOrganizationIsPending: boolean;
  updateProfileIsPending: boolean;
  changePasswordIsPending: boolean;
  pushNotifications: {
    isSupported: boolean;
    isSubscribed: boolean;
    isLoading: boolean;
    subscribe: () => Promise<boolean>;
    unsubscribe: () => Promise<boolean>;
  };
}

export const GeneralContent = ({
  organization,
  profile,
  isAdmin,
  orgName,
  setOrgName,
  fullName,
  setFullName,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  handleSaveOrgName,
  handleSaveProfile,
  handleChangePassword,
  updateOrganizationIsPending,
  updateProfileIsPending,
  changePasswordIsPending,
  pushNotifications,
}: GeneralContentProps) => {
  const { toast } = useToast();

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

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <Label>Alterar Password</Label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm text-muted-foreground">Nova Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm text-muted-foreground">Confirmar Password</Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repetir password"
                />
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changePasswordIsPending || !newPassword || !confirmPassword}
            >
              {changePasswordIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Alterar Password
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notificações Push
          </CardTitle>
          <CardDescription>
            Receba alertas instantâneos quando chegarem novos leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!pushNotifications.isSupported ? (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
              <p className="text-sm text-amber-600 dark:text-amber-400">
                O seu browser não suporta notificações push. Tente usar Chrome, Safari ou Firefox.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {pushNotifications.isSubscribed ? 'Notificações ativas' : 'Notificações desativadas'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pushNotifications.isSubscribed 
                      ? 'Vai receber alertas para novos leads.' 
                      : 'Ative para receber alertas instantâneos.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  {pushNotifications.isSubscribed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        if (!organization?.id) return;
                        try {
                          const { error } = await supabase.functions.invoke('send-push-notification', {
                            body: {
                              organization_id: organization.id,
                              title: '🔔 Teste de Notificação',
                              body: 'Se vês isto, as notificações estão a funcionar!',
                              url: '/settings',
                              tag: 'test-notification',
                            },
                          });
                          if (error) throw error;
                          toast({ title: 'Teste enviado!', description: 'Aguarda a notificação no dispositivo.' });
                        } catch (err) {
                          toast({ title: 'Erro', description: 'Não foi possível enviar o teste.', variant: 'destructive' });
                        }
                      }}
                    >
                      Testar
                    </Button>
                  )}
                  <Button
                    variant={pushNotifications.isSubscribed ? "outline" : "default"}
                    size="sm"
                    onClick={pushNotifications.isSubscribed ? pushNotifications.unsubscribe : pushNotifications.subscribe}
                    disabled={pushNotifications.isLoading}
                  >
                    {pushNotifications.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : pushNotifications.isSubscribed ? (
                      <>
                        <BellOff className="h-4 w-4 mr-2" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4 mr-2" />
                        Ativar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
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
