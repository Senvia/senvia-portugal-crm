import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateOrganization, useTestWebhook } from '@/hooks/useOrganization';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, Code, Shield, User, Building, Webhook, Send, Loader2, Link2, Check, Users, Palette } from "lucide-react";
import { PLAN_LABELS, OrganizationPlan } from "@/types";
import { supabase } from '@/integrations/supabase/client';
import { TeamTab } from '@/components/settings/TeamTab';
import { FormCustomizationSection } from '@/components/settings/FormCustomizationSection';
import { PRODUCTION_URL } from '@/lib/constants';

export default function Settings() {
  const { profile, organization } = useAuth();
  const { toast } = useToast();
  const updateOrganization = useUpdateOrganization();
  const testWebhook = useTestWebhook();
  const { canManageTeam, canManageIntegrations } = usePermissions();

  const [copied, setCopied] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoadingWebhook, setIsLoadingWebhook] = useState(true);

  const publicFormUrl = organization?.public_key ? `${PRODUCTION_URL}/p/${organization.public_key}` : '';
  const iframeCode = organization?.public_key ? `<iframe src="${publicFormUrl}" width="100%" height="500" frameborder="0"></iframe>` : '';

  // Fetch current webhook_url
  useEffect(() => {
    async function fetchWebhookUrl() {
      if (!organization?.id) return;
      
      setIsLoadingWebhook(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('webhook_url')
        .eq('id', organization.id)
        .single();
      
      if (!error && data) {
        setWebhookUrl(data.webhook_url || '');
      }
      setIsLoadingWebhook(false);
    }

    fetchWebhookUrl();
  }, [organization?.id]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: "Copiado!", description: `${label} copiado para a área de transferência.` });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveWebhook = () => {
    const urlToSave = webhookUrl.trim() || null;
    updateOrganization.mutate({ webhook_url: urlToSave });
  };

  const handleTestWebhook = () => {
    if (!webhookUrl.trim()) {
      toast({
        title: 'URL em falta',
        description: 'Introduza um URL de webhook antes de testar.',
        variant: 'destructive',
      });
      return;
    }
    testWebhook.mutate(webhookUrl.trim());
  };

  const isValidUrl = (url: string) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AppLayout userName={profile?.full_name} organizationName={organization?.name}>
      <div className="p-6 lg:p-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Definições</h1>
          <p className="text-muted-foreground">Configure a sua organização e integrações.</p>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList>
            <TabsTrigger value="general" className="gap-2">
              <Building className="h-4 w-4" />
              Geral
            </TabsTrigger>
            {canManageTeam && (
              <TabsTrigger value="team" className="gap-2">
                <Users className="h-4 w-4" />
                Equipa
              </TabsTrigger>
            )}
            {canManageIntegrations && (
              <TabsTrigger value="form" className="gap-2">
                <Palette className="h-4 w-4" />
                Formulário
              </TabsTrigger>
            )}
            {canManageIntegrations && (
              <TabsTrigger value="integrations" className="gap-2">
                <Link2 className="h-4 w-4" />
                Integrações
              </TabsTrigger>
            )}
          </TabsList>

          {/* Tab Geral */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Organização</CardTitle>
                <CardDescription>Informações da sua organização.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Nome</label>
                    <p className="text-foreground font-medium">{organization?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Plano</label>
                    <div className="flex items-center gap-2 mt-1">
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
              </CardHeader>
              <CardContent>
                <div><label className="text-sm font-medium text-muted-foreground">Nome</label><p className="text-foreground font-medium">{profile?.full_name || '-'}</p></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Conformidade RGPD</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-muted/50 p-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2"><span className="text-success">✓</span>Todos os formulários requerem consentimento explícito.</li>
                    <li className="flex items-start gap-2"><span className="text-success">✓</span>Direito ao Esquecimento disponível.</li>
                    <li className="flex items-start gap-2"><span className="text-success">✓</span>Dados encriptados.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Equipa */}
          {canManageTeam && (
            <TabsContent value="team">
              <TeamTab />
            </TabsContent>
          )}

          {/* Tab Formulário */}
          {canManageIntegrations && (
            <TabsContent value="form">
              <FormCustomizationSection />
            </TabsContent>
          )}

          {/* Tab Integrações */}
          {canManageIntegrations && (
            <TabsContent value="integrations" className="space-y-6">
            {/* Formulário Público */}
            {organization && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" />Formulário Público</CardTitle>
                  <CardDescription>Use este link para capturar leads.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Link Direto</Label>
                    <div className="flex gap-2">
                      <Input value={publicFormUrl} readOnly className="font-mono text-sm" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(publicFormUrl, 'Link')}>
                        {copied === 'Link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => window.open(publicFormUrl, '_blank')}><ExternalLink className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Código iframe</Label>
                    <div className="flex gap-2">
                      <Input value={iframeCode} readOnly className="font-mono text-xs" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(iframeCode, 'Código')}>
                        {copied === 'Código' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Label>Chave Pública</Label>
                    <div className="flex gap-2">
                      <Input value={organization.public_key} readOnly className="font-mono text-sm" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(organization.public_key, 'API Key')}>
                        {copied === 'API Key' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Webhook */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhook (n8n / Automações)
                </CardTitle>
                <CardDescription>
                  Receba notificações em tempo real quando um novo lead é criado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoadingWebhook ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">A carregar...</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="webhook-url">URL do Webhook</Label>
                      <Input
                        id="webhook-url"
                        type="url"
                        placeholder="https://seu-n8n.com/webhook/..."
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className={!isValidUrl(webhookUrl) ? 'border-destructive' : ''}
                      />
                      {!isValidUrl(webhookUrl) && (
                        <p className="text-xs text-destructive">URL inválido</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        O webhook receberá um POST com os dados do lead sempre que um novo contacto for registado.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={handleTestWebhook}
                        disabled={!webhookUrl.trim() || !isValidUrl(webhookUrl) || testWebhook.isPending}
                      >
                        {testWebhook.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Testar Webhook
                      </Button>
                      <Button
                        onClick={handleSaveWebhook}
                        disabled={!isValidUrl(webhookUrl) || updateOrganization.isPending}
                      >
                        {updateOrganization.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Guardar
                      </Button>
                    </div>

                    <div className="rounded-md bg-muted p-3">
                      <p className="text-xs font-medium mb-2">Exemplo de payload:</p>
                      <pre className="text-xs text-muted-foreground overflow-x-auto">
{`{
  "event": "lead.created",
  "timestamp": "2026-01-07T16:45:00.000Z",
  "organization": {
    "id": "uuid",
    "name": "${organization?.name || 'Nome da Empresa'}"
  },
  "lead": {
    "id": "uuid",
    "name": "João Silva",
    "email": "joao@email.com",
    "phone": "+351912345678",
    "source": "Formulário Público",
    "status": "new"
  }
}`}
                      </pre>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}
        </Tabs>
      </div>
    </AppLayout>
  );
}
