import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateOrganization, useTestWebhook } from '@/hooks/useOrganization';
import { useUpdateProfile, useChangePassword } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Copy, ExternalLink, Code, Shield, User, Building, Webhook, Send, Loader2, Link2, Check, Users, Palette, Eye, EyeOff, Save, Key, MessageCircle, Brain, MessageSquareText, Target, Plus, Trash2, ToggleLeft, ToggleRight, ArrowLeft, Bell, BellOff } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PLAN_LABELS, OrganizationPlan, MetaPixel } from "@/types";
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { TeamTab } from '@/components/settings/TeamTab';
import { FormCustomizationSection } from '@/components/settings/FormCustomizationSection';
import { PRODUCTION_URL } from '@/lib/constants';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileSettingsNav, SettingsSection } from '@/components/settings/MobileSettingsNav';

export default function Settings() {
  const { profile, organization } = useAuth();
  const { toast } = useToast();
  const updateOrganization = useUpdateOrganization();
  const testWebhook = useTestWebhook();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const { canManageTeam, canManageIntegrations, isAdmin } = usePermissions();
  const isMobile = useIsMobile();
  const pushNotifications = usePushNotifications();

  // Mobile navigation state
  const [mobileSection, setMobileSection] = useState<SettingsSection | null>(null);

  const [copied, setCopied] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);
  
  // WhatsApp Business state
  const [whatsappBaseUrl, setWhatsappBaseUrl] = useState('');
  const [whatsappInstance, setWhatsappInstance] = useState('');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  const [showWhatsappApiKey, setShowWhatsappApiKey] = useState(false);
  
  // AI Qualification Rules state
  const [aiQualificationRules, setAiQualificationRules] = useState('');
  
  // Message Templates state
  const [msgTemplateHot, setMsgTemplateHot] = useState('');
  const [msgTemplateWarm, setMsgTemplateWarm] = useState('');
  const [msgTemplateCold, setMsgTemplateCold] = useState('');

  // Meta Ads Pixels state
  const [metaPixels, setMetaPixels] = useState<MetaPixel[]>([]);

  // Form mode state (for dynamic URL)
  const [formMode, setFormMode] = useState<'traditional' | 'conversational'>('traditional');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Organization edit state
  const [orgName, setOrgName] = useState('');
  
  // Profile edit state
  const [fullName, setFullName] = useState('');
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Dynamic form URL based on mode
  const formPrefix = formMode === 'conversational' ? '/c/' : '/p/';
  const publicFormUrl = organization?.public_key ? `${PRODUCTION_URL}${formPrefix}${organization.public_key}` : '';
  const iframeCode = organization?.public_key ? `<iframe src="${publicFormUrl}" width="100%" height="500" frameborder="0"></iframe>` : '';

  // Initialize editable fields
  useEffect(() => {
    if (organization?.name) setOrgName(organization.name);
  }, [organization?.name]);

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
  }, [profile?.full_name]);

  // Fetch current integrations data
  useEffect(() => {
    async function fetchIntegrations() {
      if (!organization?.id) return;
      
      setIsLoadingIntegrations(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('webhook_url, whatsapp_base_url, whatsapp_instance, whatsapp_api_key, ai_qualification_rules, msg_template_hot, msg_template_warm, msg_template_cold, meta_pixels, form_settings')
        .eq('id', organization.id)
        .single();
      
      if (!error && data) {
        setWebhookUrl(data.webhook_url || '');
        setWhatsappBaseUrl(data.whatsapp_base_url || '');
        setWhatsappInstance(data.whatsapp_instance || '');
        setWhatsappApiKey(data.whatsapp_api_key || '');
        setAiQualificationRules(data.ai_qualification_rules || '');
        setMsgTemplateHot(data.msg_template_hot || '');
        setMsgTemplateWarm(data.msg_template_warm || '');
        setMsgTemplateCold(data.msg_template_cold || '');
        setMetaPixels(Array.isArray(data.meta_pixels) ? data.meta_pixels as unknown as MetaPixel[] : []);
        
        // Set form mode from settings
        if (data.form_settings) {
          const settings = data.form_settings as { mode?: 'traditional' | 'conversational' };
          setFormMode(settings.mode || 'traditional');
        }
      }
      setIsLoadingIntegrations(false);
    }

    fetchIntegrations();
  }, [organization?.id, refreshTrigger]);

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

  const handleSaveWhatsApp = () => {
    updateOrganization.mutate({
      whatsapp_base_url: whatsappBaseUrl.trim() || null,
      whatsapp_instance: whatsappInstance.trim() || null,
      whatsapp_api_key: whatsappApiKey.trim() || null,
    });
  };

  const handleSaveAiRules = () => {
    updateOrganization.mutate({
      ai_qualification_rules: aiQualificationRules.trim() || null,
    });
  };

  const handleSaveMessageTemplates = () => {
    updateOrganization.mutate({
      msg_template_hot: msgTemplateHot.trim() || null,
      msg_template_warm: msgTemplateWarm.trim() || null,
      msg_template_cold: msgTemplateCold.trim() || null,
    });
  };

  const handleAddPixel = () => {
    const newPixel: MetaPixel = {
      id: crypto.randomUUID(),
      name: '',
      pixel_id: '',
      enabled: true,
    };
    setMetaPixels([...metaPixels, newPixel]);
  };

  const handleRemovePixel = (id: string) => {
    setMetaPixels(metaPixels.filter(p => p.id !== id));
  };

  const handleUpdatePixel = (id: string, field: keyof MetaPixel, value: string | boolean) => {
    setMetaPixels(metaPixels.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const isValidPixelId = (pixelId: string) => {
    return /^\d{15,16}$/.test(pixelId);
  };

  const handleSaveMetaPixels = () => {
    for (const pixel of metaPixels) {
      if (!pixel.name.trim()) {
        toast({ title: 'Erro', description: 'Todos os pixels devem ter um nome.', variant: 'destructive' });
        return;
      }
      if (pixel.pixel_id && !isValidPixelId(pixel.pixel_id)) {
        toast({ title: 'Erro', description: `Pixel ID "${pixel.pixel_id}" inválido. Deve ter 15-16 dígitos.`, variant: 'destructive' });
        return;
      }
    }

    const pixelIds = metaPixels.filter(p => p.pixel_id).map(p => p.pixel_id);
    const uniqueIds = new Set(pixelIds);
    if (pixelIds.length !== uniqueIds.size) {
      toast({ title: 'Erro', description: 'Existem Pixel IDs duplicados.', variant: 'destructive' });
      return;
    }

    updateOrganization.mutate({ meta_pixels: metaPixels as unknown as Json });
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

  const handleSaveOrgName = () => {
    if (!orgName.trim()) {
      toast({ title: 'Nome inválido', description: 'O nome da organização não pode estar vazio.', variant: 'destructive' });
      return;
    }
    updateOrganization.mutate({ name: orgName.trim() });
  };

  const handleSaveProfile = () => {
    if (!fullName.trim()) {
      toast({ title: 'Nome inválido', description: 'O nome não pode estar vazio.', variant: 'destructive' });
      return;
    }
    updateProfile.mutate({ full_name: fullName.trim() });
  };

  const handleChangePassword = () => {
    if (!newPassword || !confirmPassword) {
      toast({ title: 'Campos em falta', description: 'Preencha ambos os campos de password.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Password muito curta', description: 'A password deve ter pelo menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords não coincidem', description: 'As passwords introduzidas não são iguais.', variant: 'destructive' });
      return;
    }
    changePassword.mutate({ newPassword }, {
      onSuccess: () => {
        setNewPassword('');
        setConfirmPassword('');
        setShowPassword(false);
      }
    });
  };

  // General Content Component
  const GeneralContent = () => (
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
                    disabled={updateOrganization.isPending || orgName === organization?.name}
                  >
                    {updateOrganization.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
                disabled={updateProfile.isPending || fullName === profile?.full_name}
              >
                {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
              disabled={changePassword.isPending || !newPassword || !confirmPassword}
            >
              {changePassword.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                          toast({ title: 'Erro', description: 'Falha ao enviar teste.', variant: 'destructive' });
                        }
                      }}
                    >
                      Testar
                    </Button>
                  )}
                  <Button
                    variant={pushNotifications.isSubscribed ? 'outline' : 'default'}
                    size="sm"
                    onClick={pushNotifications.toggle}
                    disabled={pushNotifications.isLoading}
                  >
                    {pushNotifications.isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : pushNotifications.isSubscribed ? (
                      <>
                        <BellOff className="mr-2 h-4 w-4" />
                        Desativar
                      </>
                    ) : (
                      <>
                        <Bell className="mr-2 h-4 w-4" />
                        Ativar
                      </>
                    )}
                  </Button>
                </div>
              </div>
              {pushNotifications.permission === 'denied' && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-xs text-destructive">
                    Notificações bloqueadas. Vá às definições do browser para permitir notificações deste site.
                  </p>
                </div>
              )}
            </>
          )}
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
    </div>
  );

  // Integrations Content Component
  const IntegrationsContent = () => (
    <div className="max-w-4xl">
      <Accordion type="multiple" className="w-full">
        {/* Formulário Público */}
        {organization && (
          <AccordionItem value="form">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  <span className="font-medium">Formulário Público</span>
                </div>
                <span className="text-xs text-muted-foreground font-normal">
                  Use este link para capturar leads.
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-6 pt-4">
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
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Webhook */}
        <AccordionItem value="webhook">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                <span className="font-medium">Webhook (n8n / Automações)</span>
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Receba notificações em tempo real quando um novo lead é criado.
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              {isLoadingIntegrations ? (
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
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* WhatsApp Business */}
        <AccordionItem value="whatsapp">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-medium">WhatsApp Business</span>
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Configure a integração com Evolution API.
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              {isLoadingIntegrations ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">A carregar...</span>
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Dados de conexão da Instância do WhatsApp deste cliente.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-base-url">URL do Servidor</Label>
                    <Input
                      id="whatsapp-base-url"
                      type="url"
                      placeholder="https://api.senvia.com"
                      value={whatsappBaseUrl}
                      onChange={(e) => setWhatsappBaseUrl(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Endereço do seu servidor Evolution API.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-instance">Nome da Instância</Label>
                    <Input
                      id="whatsapp-instance"
                      placeholder="nome-da-instancia"
                      value={whatsappInstance}
                      onChange={(e) => setWhatsappInstance(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Nome da instância configurada na Evolution API.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp-api-key">API Key da Instância</Label>
                    <div className="relative">
                      <Input
                        id="whatsapp-api-key"
                        type={showWhatsappApiKey ? 'text' : 'password'}
                        placeholder="Chave de autenticação"
                        value={whatsappApiKey}
                        onChange={(e) => setWhatsappApiKey(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowWhatsappApiKey(!showWhatsappApiKey)}
                      >
                        {showWhatsappApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Chave de autenticação da Evolution API.
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveWhatsApp}
                    disabled={updateOrganization.isPending}
                  >
                    {updateOrganization.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Modelos de Mensagem */}
        <AccordionItem value="message-templates">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5" />
                <span className="font-medium">Modelos de Mensagem</span>
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Configure mensagens automáticas por temperatura do lead.
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              {isLoadingIntegrations ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">A carregar...</span>
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
                    <p className="text-sm text-primary">
                      <strong>Dica:</strong> Use {'{nome}'} para inserir automaticamente o nome do lead na mensagem.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Mensagem para Leads HOT (Urgente)
                    </Label>
                    <Textarea
                      placeholder="Olá {nome}! 🔥 Que bom que nos contactou! Estamos prontos para ajudar..."
                      value={msgTemplateHot}
                      onChange={(e) => setMsgTemplateHot(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Mensagem para Leads WARM (Interessados)
                    </Label>
                    <Textarea
                      placeholder="Olá {nome}! Obrigado pelo seu interesse. Gostaríamos de saber mais..."
                      value={msgTemplateWarm}
                      onChange={(e) => setMsgTemplateWarm(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      Mensagem para Leads COLD (Curiosos)
                    </Label>
                    <Textarea
                      placeholder="Olá {nome}! Obrigado por nos contactar. Temos várias soluções..."
                      value={msgTemplateCold}
                      onChange={(e) => setMsgTemplateCold(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>

                  <Button
                    onClick={handleSaveMessageTemplates}
                    disabled={updateOrganization.isPending}
                  >
                    {updateOrganization.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Modelos
                  </Button>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Inteligência Artificial */}
        <AccordionItem value="ai">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                <span className="font-medium">Inteligência Artificial</span>
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Configure as regras de qualificação automática de leads.
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              {isLoadingIntegrations ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">A carregar...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="ai-rules">Regras de Qualificação</Label>
                    <Textarea
                      id="ai-rules"
                      placeholder={`Exemplo:\n\nClassifica como HOT se:\n- Lead mencionar urgência ou dor específica\n- Tiver orçamento definido\n- Quiser agendar para esta semana\n\nClassifica como WARM se:\n- Mostrar interesse mas sem urgência\n\nClassifica como COLD se:\n- Apenas pedir informações genéricas`}
                      value={aiQualificationRules}
                      onChange={(e) => setAiQualificationRules(e.target.value)}
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Descreva aqui as regras para a IA decidir se um Lead é Quente, Morno ou Frio.
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveAiRules}
                    disabled={updateOrganization.isPending}
                  >
                    {updateOrganization.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar
                  </Button>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Meta Ads Pixels */}
        <AccordionItem value="meta-ads">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                <span className="font-medium">Meta Ads Pixels</span>
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Adicione pixels do Facebook/Meta para rastrear conversões.
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-4 pt-4">
              {isLoadingIntegrations ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">A carregar...</span>
                </div>
              ) : (
                <>
                  <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                      Os pixels serão carregados no formulário público e dispararão eventos <strong>PageView</strong> e <strong>Lead</strong> automaticamente.
                    </p>
                  </div>

                  {metaPixels.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum pixel configurado.</p>
                  ) : (
                    <div className="space-y-3">
                      {metaPixels.map((pixel, index) => (
                        <div key={pixel.id} className="flex flex-col sm:flex-row gap-3 p-3 rounded-lg border bg-card">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground font-medium">#{index + 1}</span>
                              <Input
                                placeholder="Nome do pixel (ex: Pixel Principal)"
                                value={pixel.name}
                                onChange={(e) => handleUpdatePixel(pixel.id, 'name', e.target.value)}
                                className="flex-1"
                              />
                            </div>
                            <Input
                              placeholder="Pixel ID (15-16 dígitos)"
                              value={pixel.pixel_id}
                              onChange={(e) => handleUpdatePixel(pixel.id, 'pixel_id', e.target.value.replace(/\D/g, '').slice(0, 16))}
                              className={pixel.pixel_id && !isValidPixelId(pixel.pixel_id) ? 'border-destructive' : ''}
                            />
                            {pixel.pixel_id && !isValidPixelId(pixel.pixel_id) && (
                              <p className="text-xs text-destructive">Pixel ID deve ter 15-16 dígitos</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 sm:flex-col sm:justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleUpdatePixel(pixel.id, 'enabled', !pixel.enabled)}
                              className={pixel.enabled ? 'text-green-500' : 'text-muted-foreground'}
                              title={pixel.enabled ? 'Ativo' : 'Inativo'}
                            >
                              {pixel.enabled ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemovePixel(pixel.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddPixel}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar Pixel
                    </Button>
                    <Button
                      onClick={handleSaveMetaPixels}
                      disabled={updateOrganization.isPending}
                    >
                      {updateOrganization.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Guardar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );

  // Section titles for mobile header
  const sectionTitles: Record<SettingsSection, string> = {
    general: "Geral",
    team: "Equipa",
    form: "Formulário",
    integrations: "Integrações",
  };

  return (
    <AppLayout userName={profile?.full_name} organizationName={organization?.name}>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Mobile: Navigation List or Section Content */}
        {isMobile ? (
          mobileSection === null ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Definições</h1>
                <p className="text-muted-foreground">Configure a sua organização e integrações.</p>
              </div>
              <MobileSettingsNav
                activeSection={mobileSection}
                onSelectSection={setMobileSection}
                canManageTeam={canManageTeam}
                canManageIntegrations={canManageIntegrations}
              />
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileSection(null)}
                  className="shrink-0"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold text-foreground">{sectionTitles[mobileSection]}</h1>
              </div>
              {mobileSection === "general" && <GeneralContent />}
              {mobileSection === "team" && canManageTeam && <TeamTab />}
              {mobileSection === "form" && canManageIntegrations && <FormCustomizationSection onSettingsSaved={() => setRefreshTrigger(prev => prev + 1)} />}
              {mobileSection === "integrations" && canManageIntegrations && <IntegrationsContent />}
            </>
          )
        ) : (
          /* Desktop: Traditional Tabs */
          <>
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

              <TabsContent value="general" className="space-y-6">
                <GeneralContent />
              </TabsContent>

              {canManageTeam && (
                <TabsContent value="team" className="max-w-4xl">
                  <TeamTab />
                </TabsContent>
              )}

              {canManageIntegrations && (
                <TabsContent value="form" className="w-full max-w-none">
                  <FormCustomizationSection onSettingsSaved={() => setRefreshTrigger(prev => prev + 1)} />
                </TabsContent>
              )}

              {canManageIntegrations && (
                <TabsContent value="integrations">
                  <IntegrationsContent />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
