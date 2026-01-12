import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateOrganization, useTestWebhook } from '@/hooks/useOrganization';
import { useUpdateProfile, useChangePassword } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Building, Users, Palette, Link2, ArrowLeft } from "lucide-react";
import { MetaPixel } from "@/types";
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { TeamTab } from '@/components/settings/TeamTab';
import { FormsManager } from '@/components/settings/FormsManager';
import { GeneralContent } from '@/components/settings/GeneralContent';
import { IntegrationsContent } from '@/components/settings/IntegrationsContent';
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

  // Dynamic form URL based on mode - using slug for friendly URLs
  const formPrefix = formMode === 'conversational' ? '/c/' : '/f/';
  const publicFormUrl = organization?.slug ? `${PRODUCTION_URL}${formPrefix}${organization.slug}` : '';
  const iframeCode = organization?.slug ? `<iframe src="${publicFormUrl}" width="100%" height="500" frameborder="0"></iframe>` : '';

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
              {mobileSection === "general" && (
                <GeneralContent
                  organization={organization}
                  profile={profile}
                  isAdmin={isAdmin}
                  orgName={orgName}
                  setOrgName={setOrgName}
                  fullName={fullName}
                  setFullName={setFullName}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  handleSaveOrgName={handleSaveOrgName}
                  handleSaveProfile={handleSaveProfile}
                  handleChangePassword={handleChangePassword}
                  updateOrganizationIsPending={updateOrganization.isPending}
                  updateProfileIsPending={updateProfile.isPending}
                  changePasswordIsPending={changePassword.isPending}
                  pushNotifications={pushNotifications}
                />
              )}
              {mobileSection === "team" && canManageTeam && <TeamTab />}
              {mobileSection === "form" && canManageIntegrations && <FormsManager />}
              {mobileSection === "integrations" && canManageIntegrations && (
                <IntegrationsContent
                  organization={organization}
                  publicFormUrl={publicFormUrl}
                  iframeCode={iframeCode}
                  copied={copied}
                  copyToClipboard={copyToClipboard}
                  isLoadingIntegrations={isLoadingIntegrations}
                  webhookUrl={webhookUrl}
                  setWebhookUrl={setWebhookUrl}
                  isValidUrl={isValidUrl}
                  handleTestWebhook={handleTestWebhook}
                  handleSaveWebhook={handleSaveWebhook}
                  testWebhookIsPending={testWebhook.isPending}
                  updateOrganizationIsPending={updateOrganization.isPending}
                  whatsappBaseUrl={whatsappBaseUrl}
                  setWhatsappBaseUrl={setWhatsappBaseUrl}
                  whatsappInstance={whatsappInstance}
                  setWhatsappInstance={setWhatsappInstance}
                  whatsappApiKey={whatsappApiKey}
                  setWhatsappApiKey={setWhatsappApiKey}
                  showWhatsappApiKey={showWhatsappApiKey}
                  setShowWhatsappApiKey={setShowWhatsappApiKey}
                  handleSaveWhatsApp={handleSaveWhatsApp}
                  msgTemplateHot={msgTemplateHot}
                  setMsgTemplateHot={setMsgTemplateHot}
                  msgTemplateWarm={msgTemplateWarm}
                  setMsgTemplateWarm={setMsgTemplateWarm}
                  msgTemplateCold={msgTemplateCold}
                  setMsgTemplateCold={setMsgTemplateCold}
                  handleSaveMessageTemplates={handleSaveMessageTemplates}
                  aiQualificationRules={aiQualificationRules}
                  setAiQualificationRules={setAiQualificationRules}
                  handleSaveAiRules={handleSaveAiRules}
                  metaPixels={metaPixels}
                  handleAddPixel={handleAddPixel}
                  handleRemovePixel={handleRemovePixel}
                  handleUpdatePixel={handleUpdatePixel}
                  isValidPixelId={isValidPixelId}
                  handleSaveMetaPixels={handleSaveMetaPixels}
                />
              )}
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
                <GeneralContent
                  organization={organization}
                  profile={profile}
                  isAdmin={isAdmin}
                  orgName={orgName}
                  setOrgName={setOrgName}
                  fullName={fullName}
                  setFullName={setFullName}
                  newPassword={newPassword}
                  setNewPassword={setNewPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                  handleSaveOrgName={handleSaveOrgName}
                  handleSaveProfile={handleSaveProfile}
                  handleChangePassword={handleChangePassword}
                  updateOrganizationIsPending={updateOrganization.isPending}
                  updateProfileIsPending={updateProfile.isPending}
                  changePasswordIsPending={changePassword.isPending}
                  pushNotifications={pushNotifications}
                />
              </TabsContent>

              {canManageTeam && (
                <TabsContent value="team" className="max-w-4xl">
                  <TeamTab />
                </TabsContent>
              )}

              {canManageIntegrations && (
                <TabsContent value="form" className="w-full max-w-none">
                  <FormsManager />
                </TabsContent>
              )}

              {canManageIntegrations && (
                <TabsContent value="integrations">
                  <IntegrationsContent
                    organization={organization}
                    publicFormUrl={publicFormUrl}
                    iframeCode={iframeCode}
                    copied={copied}
                    copyToClipboard={copyToClipboard}
                    isLoadingIntegrations={isLoadingIntegrations}
                    webhookUrl={webhookUrl}
                    setWebhookUrl={setWebhookUrl}
                    isValidUrl={isValidUrl}
                    handleTestWebhook={handleTestWebhook}
                    handleSaveWebhook={handleSaveWebhook}
                    testWebhookIsPending={testWebhook.isPending}
                    updateOrganizationIsPending={updateOrganization.isPending}
                    whatsappBaseUrl={whatsappBaseUrl}
                    setWhatsappBaseUrl={setWhatsappBaseUrl}
                    whatsappInstance={whatsappInstance}
                    setWhatsappInstance={setWhatsappInstance}
                    whatsappApiKey={whatsappApiKey}
                    setWhatsappApiKey={setWhatsappApiKey}
                    showWhatsappApiKey={showWhatsappApiKey}
                    setShowWhatsappApiKey={setShowWhatsappApiKey}
                    handleSaveWhatsApp={handleSaveWhatsApp}
                    msgTemplateHot={msgTemplateHot}
                    setMsgTemplateHot={setMsgTemplateHot}
                    msgTemplateWarm={msgTemplateWarm}
                    setMsgTemplateWarm={setMsgTemplateWarm}
                    msgTemplateCold={msgTemplateCold}
                    setMsgTemplateCold={setMsgTemplateCold}
                    handleSaveMessageTemplates={handleSaveMessageTemplates}
                    aiQualificationRules={aiQualificationRules}
                    setAiQualificationRules={setAiQualificationRules}
                    handleSaveAiRules={handleSaveAiRules}
                    metaPixels={metaPixels}
                    handleAddPixel={handleAddPixel}
                    handleRemovePixel={handleRemovePixel}
                    handleUpdatePixel={handleUpdatePixel}
                    isValidPixelId={isValidPixelId}
                    handleSaveMetaPixels={handleSaveMetaPixels}
                  />
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
