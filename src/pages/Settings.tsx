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
import { Building, Users, Palette, Link2, ArrowLeft, Package, GitBranch, LayoutGrid, UserCheck } from "lucide-react";
import { PipelineEditor } from '@/components/settings/PipelineEditor';
import { ProductsTab } from '@/components/settings/ProductsTab';
import { ModulesTab } from '@/components/settings/ModulesTab';
import { supabase } from '@/integrations/supabase/client';
import { TeamTab } from '@/components/settings/TeamTab';
import { FormsManager } from '@/components/settings/FormsManager';
import { GeneralContent } from '@/components/settings/GeneralContent';
import { IntegrationsContent } from '@/components/settings/IntegrationsContent';
import { ClientFieldsEditor } from '@/components/settings/ClientFieldsEditor';
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
  
  // Brevo Email state
  const [brevoApiKey, setBrevoApiKey] = useState('');
  const [brevoSenderEmail, setBrevoSenderEmail] = useState('');
  const [showBrevoApiKey, setShowBrevoApiKey] = useState(false);
  

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
        .select('webhook_url, whatsapp_base_url, whatsapp_instance, whatsapp_api_key, form_settings, brevo_api_key, brevo_sender_email')
        .eq('id', organization.id)
        .single();
      
      if (!error && data) {
        setWebhookUrl(data.webhook_url || '');
        setWhatsappBaseUrl(data.whatsapp_base_url || '');
        setWhatsappInstance(data.whatsapp_instance || '');
        setWhatsappApiKey(data.whatsapp_api_key || '');
        setBrevoApiKey(data.brevo_api_key || '');
        setBrevoSenderEmail(data.brevo_sender_email || '');
        
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

  const handleSaveBrevo = () => {
    updateOrganization.mutate({
      brevo_api_key: brevoApiKey.trim() || null,
      brevo_sender_email: brevoSenderEmail.trim() || null,
    });
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
    pipeline: "Pipeline",
    modules: "Módulos",
    form: "Formulário",
    products: "Produtos",
    clients: "Campos",
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
              {mobileSection === "pipeline" && canManageIntegrations && <PipelineEditor />}
              {mobileSection === "modules" && canManageIntegrations && <ModulesTab />}
              {mobileSection === "form" && canManageIntegrations && <FormsManager />}
              {mobileSection === "products" && canManageIntegrations && <ProductsTab />}
              {mobileSection === "clients" && canManageIntegrations && <ClientFieldsEditor />}
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
                  brevoApiKey={brevoApiKey}
                  setBrevoApiKey={setBrevoApiKey}
                  brevoSenderEmail={brevoSenderEmail}
                  setBrevoSenderEmail={setBrevoSenderEmail}
                  showBrevoApiKey={showBrevoApiKey}
                  setShowBrevoApiKey={setShowBrevoApiKey}
                  handleSaveBrevo={handleSaveBrevo}
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
                  <TabsTrigger value="pipeline" className="gap-2">
                    <GitBranch className="h-4 w-4" />
                    Pipeline
                  </TabsTrigger>
                )}
                {canManageIntegrations && (
                  <TabsTrigger value="modules" className="gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    Módulos
                  </TabsTrigger>
                )}
                {canManageIntegrations && (
                  <TabsTrigger value="form" className="gap-2">
                    <Palette className="h-4 w-4" />
                    Formulário
                  </TabsTrigger>
                )}
                {canManageIntegrations && (
                  <TabsTrigger value="products" className="gap-2">
                    <Package className="h-4 w-4" />
                    Produtos
                  </TabsTrigger>
                )}
              {canManageIntegrations && (
                  <TabsTrigger value="clients" className="gap-2">
                    <UserCheck className="h-4 w-4" />
                    Campos
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
                <TabsContent value="pipeline" className="max-w-4xl">
                  <PipelineEditor />
                </TabsContent>
              )}

              {canManageIntegrations && (
                <TabsContent value="modules" className="max-w-4xl">
                  <ModulesTab />
                </TabsContent>
              )}

              {canManageIntegrations && (
                <TabsContent value="form" className="w-full max-w-none">
                  <FormsManager />
                </TabsContent>
              )}

              {canManageIntegrations && (
                <TabsContent value="products" className="max-w-4xl">
                  <ProductsTab />
                </TabsContent>
              )}

              {canManageIntegrations && (
                <TabsContent value="clients" className="max-w-4xl">
                  <ClientFieldsEditor />
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
                    brevoApiKey={brevoApiKey}
                    setBrevoApiKey={setBrevoApiKey}
                    brevoSenderEmail={brevoSenderEmail}
                    setBrevoSenderEmail={setBrevoSenderEmail}
                    showBrevoApiKey={showBrevoApiKey}
                    setShowBrevoApiKey={setShowBrevoApiKey}
                    handleSaveBrevo={handleSaveBrevo}
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
