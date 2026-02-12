import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateOrganization, useTestWebhook } from '@/hooks/useOrganization';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { useUpdateProfile, useChangePassword } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Building, UsersRound, Package, Link2, ArrowLeft, Bell, Receipt, Shield } from "lucide-react";
import { PipelineEditor } from '@/components/settings/PipelineEditor';
import { ProductsTab } from '@/components/settings/ProductsTab';
import { ModulesTab } from '@/components/settings/ModulesTab';
import { supabase } from '@/integrations/supabase/client';
import { TeamTab } from '@/components/settings/TeamTab';
import { TeamsSection } from '@/components/settings/TeamsSection';
import { FormsManager } from '@/components/settings/FormsManager';
import { GeneralContent } from '@/components/settings/GeneralContent';
import { IntegrationsContent } from '@/components/settings/IntegrationsContent';
import { ClientFieldsEditor } from '@/components/settings/ClientFieldsEditor';
import { FidelizationAlertsSettings } from '@/components/settings/FidelizationAlertsSettings';
import { ExpenseCategoriesTab } from '@/components/settings/ExpenseCategoriesTab';
import { PushNotificationsCard } from '@/components/settings/PushNotificationsCard';
import { PRODUCTION_URL } from '@/lib/constants';
import { ProfilesTab } from '@/components/settings/ProfilesTab';
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
  
  // InvoiceXpress state
  const [invoiceXpressAccountName, setInvoiceXpressAccountName] = useState('');
  const [invoiceXpressApiKey, setInvoiceXpressApiKey] = useState('');
  const [showInvoiceXpressApiKey, setShowInvoiceXpressApiKey] = useState(false);
  const [taxRate, setTaxRate] = useState('23');
  const [taxExemptionReason, setTaxExemptionReason] = useState('');

  // KeyInvoice state
  const [keyinvoiceApiKey, setKeyinvoiceApiKey] = useState('');
  const [keyinvoiceApiUrl, setKeyinvoiceApiUrl] = useState('');
  const [showKeyinvoiceApiKey, setShowKeyinvoiceApiKey] = useState(false);

  // Integrations enabled state
  const [integrationsEnabled, setIntegrationsEnabled] = useState<Record<string, boolean>>({
    webhook: true, whatsapp: true, brevo: true, invoicexpress: true, keyinvoice: false,
  });

  // Form mode state
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

  // Dynamic form URL
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
        .select('webhook_url, whatsapp_base_url, whatsapp_instance, whatsapp_api_key, form_settings, brevo_api_key, brevo_sender_email, invoicexpress_account_name, invoicexpress_api_key, integrations_enabled, tax_config, billing_provider, keyinvoice_username, keyinvoice_password, keyinvoice_company_code, keyinvoice_api_url')
        .eq('id', organization.id)
        .single();
      
      if (!error && data) {
        setWebhookUrl(data.webhook_url || '');
        setWhatsappBaseUrl(data.whatsapp_base_url || '');
        setWhatsappInstance(data.whatsapp_instance || '');
        setWhatsappApiKey(data.whatsapp_api_key || '');
        setBrevoApiKey(data.brevo_api_key || '');
        setBrevoSenderEmail(data.brevo_sender_email || '');
        setInvoiceXpressAccountName((data as any).invoicexpress_account_name || '');
        setInvoiceXpressApiKey((data as any).invoicexpress_api_key || '');
        setKeyinvoiceApiKey((data as any).keyinvoice_password || '');
        setKeyinvoiceApiUrl((data as any).keyinvoice_api_url || '');

        const tc = (data as any).tax_config;
        if (tc) {
          setTaxRate(String(tc.tax_value ?? 23));
          setTaxExemptionReason(tc.tax_exemption_reason || '');
        }

        if ((data as any).integrations_enabled) {
          setIntegrationsEnabled({
            webhook: true, whatsapp: true, brevo: true, invoicexpress: true, keyinvoice: false,
            ...((data as any).integrations_enabled as Record<string, boolean>),
          });
        }
        
        if (data.form_settings) {
          const settings = data.form_settings as { mode?: 'traditional' | 'conversational' };
          setFormMode(settings.mode || 'traditional');
        }
      }
      setIsLoadingIntegrations(false);
    }

    fetchIntegrations();
  }, [organization?.id, refreshTrigger]);

  const handleToggleIntegration = async (key: string, enabled: boolean) => {
    let newState = { ...integrationsEnabled, [key]: enabled };
    if (enabled && key === 'invoicexpress') newState.keyinvoice = false;
    else if (enabled && key === 'keyinvoice') newState.invoicexpress = false;
    setIntegrationsEnabled(newState);
    
    let billingProviderValue: string | undefined;
    if (key === 'invoicexpress' || key === 'keyinvoice') {
      if (newState.invoicexpress) billingProviderValue = 'invoicexpress';
      else if (newState.keyinvoice) billingProviderValue = 'keyinvoice';
    }
    
    if (organization?.id) {
      const updateData: Record<string, any> = { integrations_enabled: newState };
      if (billingProviderValue !== undefined) updateData.billing_provider = billingProviderValue;
      await supabase.from('organizations').update(updateData).eq('id', organization.id);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast({ title: "Copiado!", description: `${label} copiado para a área de transferência.` });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleSaveWebhook = () => {
    updateOrganization.mutate({ webhook_url: webhookUrl.trim() || null });
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

  const handleSaveInvoiceXpress = () => {
    const taxValue = Number(taxRate);
    const taxName = taxValue === 0 ? 'Isento' : `IVA${taxValue}`;
    updateOrganization.mutate({
      invoicexpress_account_name: invoiceXpressAccountName.trim() || null,
      invoicexpress_api_key: invoiceXpressApiKey.trim() || null,
      tax_config: { tax_name: taxName, tax_value: taxValue, tax_exemption_reason: taxValue === 0 ? taxExemptionReason : null },
    });
  };

  const handleSaveKeyInvoice = () => {
    const taxValue = Number(taxRate);
    const taxName = taxValue === 0 ? 'Isento' : `IVA${taxValue}`;
    updateOrganization.mutate({
      keyinvoice_password: keyinvoiceApiKey.trim() || null,
      keyinvoice_api_url: keyinvoiceApiUrl.trim() || null,
      tax_config: { tax_name: taxName, tax_value: taxValue, tax_exemption_reason: taxValue === 0 ? taxExemptionReason : null },
    });
  };

  const handleTestWebhook = () => {
    if (!webhookUrl.trim()) {
      toast({ title: 'URL em falta', description: 'Introduza um URL de webhook antes de testar.', variant: 'destructive' });
      return;
    }
    testWebhook.mutate(webhookUrl.trim());
  };

  const isValidUrl = (url: string) => {
    if (!url) return true;
    try { new URL(url); return true; } catch { return false; }
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
      onSuccess: () => { setNewPassword(''); setConfirmPassword(''); setShowPassword(false); }
    });
  };

  // Shared props for GeneralContent
  const generalContentProps = {
    organization, profile, isAdmin, orgName, setOrgName, fullName, setFullName,
    handleSaveOrgName, handleSaveProfile,
    updateOrganizationIsPending: updateOrganization.isPending,
    updateProfileIsPending: updateProfile.isPending,
  };

  // Shared props for IntegrationsContent
  const integrationsContentProps = {
    organization, publicFormUrl, iframeCode, copied, copyToClipboard,
    isLoadingIntegrations, webhookUrl, setWebhookUrl, isValidUrl,
    handleTestWebhook, handleSaveWebhook,
    testWebhookIsPending: testWebhook.isPending,
    updateOrganizationIsPending: updateOrganization.isPending,
    whatsappBaseUrl, setWhatsappBaseUrl, whatsappInstance, setWhatsappInstance,
    whatsappApiKey, setWhatsappApiKey, showWhatsappApiKey, setShowWhatsappApiKey,
    handleSaveWhatsApp, brevoApiKey, setBrevoApiKey, brevoSenderEmail, setBrevoSenderEmail,
    showBrevoApiKey, setShowBrevoApiKey, handleSaveBrevo,
    invoiceXpressAccountName, setInvoiceXpressAccountName,
    invoiceXpressApiKey, setInvoiceXpressApiKey,
    showInvoiceXpressApiKey, setShowInvoiceXpressApiKey,
    handleSaveInvoiceXpress, taxRate, setTaxRate, taxExemptionReason, setTaxExemptionReason,
    integrationsEnabled, onToggleIntegration: handleToggleIntegration,
    handleSaveKeyInvoice, keyinvoiceApiKey, setKeyinvoiceApiKey,
    showKeyinvoiceApiKey, setShowKeyinvoiceApiKey, keyinvoiceApiUrl, setKeyinvoiceApiUrl,
  };

  // Section titles for mobile header
  const sectionTitles: Record<SettingsSection, string> = {
    general: "Definições Gerais",
    security: "Segurança",
    team: "Equipa e Acessos",
    products: "Produtos",
    finance: "Financeiro",
    notifications: "Notificações",
    integrations: "Integrações",
  };

  // Render grouped content for a section
  const renderGroupContent = (section: SettingsSection) => {
    switch (section) {
      case "general":
        return (
          <div className="space-y-8">
            <GeneralContent {...generalContentProps} />
            {canManageIntegrations && (
              <>
                <Separator />
                <PipelineEditor />
                <Separator />
                <ModulesTab />
                <Separator />
                <FormsManager />
                <Separator />
                <ClientFieldsEditor />
              </>
            )}
          </div>
        );
      case "security":
        return (
          <div className="max-w-4xl">
            <SecuritySettings
              newPassword={newPassword} setNewPassword={setNewPassword}
              confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
              showPassword={showPassword} setShowPassword={setShowPassword}
              handleChangePassword={handleChangePassword}
              changePasswordIsPending={changePassword.isPending}
            />
          </div>
        );
      case "team":
        return canManageTeam ? (
          <div className="space-y-8 max-w-4xl">
            <TeamTab />
            <Separator />
            <ProfilesTab />
            <Separator />
            <TeamsSection />
          </div>
        ) : null;
      case "products":
        return canManageIntegrations ? (
          <div className="max-w-4xl"><ProductsTab /></div>
        ) : null;
      case "finance":
        return canManageIntegrations ? (
          <div className="max-w-4xl"><ExpenseCategoriesTab /></div>
        ) : null;
      case "notifications":
        return (
          <div className="space-y-8 max-w-4xl">
            <PushNotificationsCard organizationId={organization?.id} pushNotifications={pushNotifications} />
            {canManageIntegrations && (
              <>
                <Separator />
                <FidelizationAlertsSettings />
              </>
            )}
          </div>
        );
      case "integrations":
        return canManageIntegrations ? (
          <IntegrationsContent {...integrationsContentProps} />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <AppLayout userName={profile?.full_name} organizationName={organization?.name}>
      <div className="p-4 sm:p-6 lg:p-8">
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
                <Button variant="ghost" size="icon" onClick={() => setMobileSection(null)} className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold text-foreground">{sectionTitles[mobileSection]}</h1>
              </div>
              {renderGroupContent(mobileSection)}
            </>
          )
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">Definições</h1>
              <p className="text-muted-foreground">Configure a sua organização e integrações.</p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
              <TabsList className="flex-wrap h-auto gap-0">
                <TabsTrigger value="general" className="gap-2">
                  <Building className="h-4 w-4" />
                  Definições Gerais
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Segurança
                </TabsTrigger>
                {canManageTeam && (
                  <TabsTrigger value="team" className="gap-2">
                    <UsersRound className="h-4 w-4" />
                    Equipa e Acessos
                  </TabsTrigger>
                )}
                {canManageIntegrations && (
                  <TabsTrigger value="products" className="gap-2">
                    <Package className="h-4 w-4" />
                    Produtos
                  </TabsTrigger>
                )}
                {canManageIntegrations && (
                  <TabsTrigger value="finance" className="gap-2">
                    <Receipt className="h-4 w-4" />
                    Financeiro
                  </TabsTrigger>
                )}
                <TabsTrigger value="notifications" className="gap-2">
                  <Bell className="h-4 w-4" />
                  Notificações
                </TabsTrigger>
                {canManageIntegrations && (
                  <TabsTrigger value="integrations" className="gap-2">
                    <Link2 className="h-4 w-4" />
                    Integrações
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="general" className="space-y-6">
                {renderGroupContent("general")}
              </TabsContent>

              <TabsContent value="security">
                {renderGroupContent("security")}
              </TabsContent>

              {canManageTeam && (
                <TabsContent value="team">
                  {renderGroupContent("team")}
                </TabsContent>
              )}

              {canManageIntegrations && (
                <TabsContent value="products">
                  {renderGroupContent("products")}
                </TabsContent>
              )}

              {canManageIntegrations && (
                <TabsContent value="finance">
                  {renderGroupContent("finance")}
                </TabsContent>
              )}

              <TabsContent value="notifications">
                {renderGroupContent("notifications")}
              </TabsContent>

              {canManageIntegrations && (
                <TabsContent value="integrations">
                  {renderGroupContent("integrations")}
                </TabsContent>
              )}
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
