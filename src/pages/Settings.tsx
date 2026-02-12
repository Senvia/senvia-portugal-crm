import { useState, useEffect } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateOrganization, useTestWebhook } from '@/hooks/useOrganization';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { useUpdateProfile, useChangePassword } from '@/hooks/useProfile';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { FiscalSettingsTab } from '@/components/settings/FiscalSettingsTab';
import { PushNotificationsCard } from '@/components/settings/PushNotificationsCard';

import { ProfilesTab } from '@/components/settings/ProfilesTab';
import { useIsMobile } from '@/hooks/use-mobile';
import { 
  MobileSettingsNav, 
  MobileSubSectionNav, 
  SettingsSection, 
  SettingsSubSection,
  subSectionsMap,
  directContentGroups,
  sectionTitles 
} from '@/components/settings/MobileSettingsNav';

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

  // Mobile navigation state (3 levels)
  const [mobileGroup, setMobileGroup] = useState<SettingsSection | null>(null);
  const [mobileSub, setMobileSub] = useState<SettingsSubSection | null>(null);

  
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

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Organization edit state
  const [orgName, setOrgName] = useState('');
  
  // Profile edit state
  const [fullName, setFullName] = useState('');
  
  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);


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
    updateOrganization.mutate({
      invoicexpress_account_name: invoiceXpressAccountName.trim() || null,
      invoicexpress_api_key: invoiceXpressApiKey.trim() || null,
    });
  };

  const handleSaveKeyInvoice = () => {
    updateOrganization.mutate({
      keyinvoice_password: keyinvoiceApiKey.trim() || null,
      keyinvoice_api_url: keyinvoiceApiUrl.trim() || null,
    });
  };

  const handleSaveFiscal = () => {
    const taxValue = Number(taxRate);
    const taxName = taxValue === 0 ? 'Isento' : `IVA${taxValue}`;
    updateOrganization.mutate({
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

  // Shared props
  const generalContentProps = {
    organization, profile, isAdmin, orgName, setOrgName, fullName, setFullName,
    handleSaveOrgName, handleSaveProfile,
    updateOrganizationIsPending: updateOrganization.isPending,
    updateProfileIsPending: updateProfile.isPending,
  };

  const integrationsContentProps = {
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
    handleSaveInvoiceXpress,
    integrationsEnabled, onToggleIntegration: handleToggleIntegration,
    handleSaveKeyInvoice, keyinvoiceApiKey, setKeyinvoiceApiKey,
    showKeyinvoiceApiKey, setShowKeyinvoiceApiKey, keyinvoiceApiUrl, setKeyinvoiceApiUrl,
  };

  // Render individual sub-section content
  const renderSubContent = (sub: SettingsSubSection) => {
    switch (sub) {
      case "org-general": return <GeneralContent {...generalContentProps} />;
      case "org-pipeline": return <PipelineEditor />;
      case "org-modules": return <ModulesTab />;
      case "org-forms": return <FormsManager />;
      case "org-fields": return <ClientFieldsEditor />;
      case "security": return (
        <SecuritySettings
          newPassword={newPassword} setNewPassword={setNewPassword}
          confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
          showPassword={showPassword} setShowPassword={setShowPassword}
          handleChangePassword={handleChangePassword}
          changePasswordIsPending={changePassword.isPending}
        />
      );
      case "team-access": return <TeamTab />;
      case "team-profiles": return <ProfilesTab />;
      case "team-teams": return <TeamsSection />;
      case "products": return <ProductsTab />;
      case "finance-expenses": return <ExpenseCategoriesTab />;
      case "finance-fiscal": return (
        <FiscalSettingsTab
          taxRate={taxRate}
          setTaxRate={setTaxRate}
          taxExemptionReason={taxExemptionReason}
          setTaxExemptionReason={setTaxExemptionReason}
          onSave={handleSaveFiscal}
          isPending={updateOrganization.isPending}
        />
      );
      case "notif-push": return <PushNotificationsCard organizationId={organization?.id} pushNotifications={pushNotifications} />;
      case "notif-alerts": return <FidelizationAlertsSettings />;
      case "integrations": return <IntegrationsContent {...integrationsContentProps} />;
      default: return null;
    }
  };

  // Get the direct sub-section for groups with no sub-nav
  const getDirectSub = (group: SettingsSection): SettingsSubSection => {
    switch (group) {
      case "security": return "security";
      case "products": return "products";
      case "integrations": return "integrations";
      case "integrations": return "integrations";
      default: return "security"; // fallback
    }
  };

  // Mobile: handle group selection (direct or drill-down)
  const handleMobileGroupSelect = (group: SettingsSection) => {
    setMobileGroup(group);
    if (directContentGroups.includes(group)) {
      setMobileSub(getDirectSub(group));
    } else {
      setMobileSub(null);
    }
  };

  // Mobile: back navigation
  const handleMobileBack = () => {
    if (mobileSub !== null && !directContentGroups.includes(mobileGroup!)) {
      // Go back to sub-section list
      setMobileSub(null);
    } else {
      // Go back to group list
      setMobileGroup(null);
      setMobileSub(null);
    }
  };

  // Mobile breadcrumb title
  const getMobileTitle = () => {
    if (!mobileGroup) return "Definições";
    const groupTitle = sectionTitles[mobileGroup];
    if (mobileSub && !directContentGroups.includes(mobileGroup)) {
      const subItems = subSectionsMap[mobileGroup];
      const subItem = subItems.find(s => s.id === mobileSub);
      return subItem?.label || groupTitle;
    }
    return groupTitle;
  };

  // Desktop: render content for a group tab
  const renderDesktopGroupContent = (group: SettingsSection) => {
    const subs = subSectionsMap[group];
    
    // Direct content groups (no sub-tabs)
    if (directContentGroups.includes(group)) {
      return <div className="max-w-4xl">{renderSubContent(getDirectSub(group))}</div>;
    }

    // Groups with sub-tabs
    const defaultSub = subs[0]?.id;
    return (
      <Tabs defaultValue={defaultSub} className="space-y-4">
        <TabsList className="h-auto gap-1 bg-muted/50 p-1">
          {subs.map(sub => (
            <TabsTrigger key={sub.id} value={sub.id} className="gap-2 text-sm">
              <sub.icon className="h-4 w-4" />
              {sub.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {subs.map(sub => (
          <TabsContent key={sub.id} value={sub.id}>
            <div className="max-w-4xl">{renderSubContent(sub.id)}</div>
          </TabsContent>
        ))}
      </Tabs>
    );
  };

  return (
    <AppLayout userName={profile?.full_name} organizationName={organization?.name}>
      <div className="p-4 sm:p-6 lg:p-8">
        {isMobile ? (
          mobileGroup === null ? (
            // Level 1: Group list
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">Definições</h1>
                <p className="text-muted-foreground">Configure a sua organização e integrações.</p>
              </div>
              <MobileSettingsNav
                activeSection={null}
                onSelectSection={handleMobileGroupSelect}
                canManageTeam={canManageTeam}
                canManageIntegrations={canManageIntegrations}
              />
            </>
          ) : mobileSub === null ? (
            // Level 2: Sub-section list within group
            <>
              <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" onClick={handleMobileBack} className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold text-foreground">{sectionTitles[mobileGroup]}</h1>
              </div>
              <MobileSubSectionNav
                group={mobileGroup}
                onSelectSubSection={(sub) => setMobileSub(sub)}
              />
            </>
          ) : (
            // Level 3: Sub-section content
            <>
              <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" onClick={handleMobileBack} className="shrink-0">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold text-foreground">{getMobileTitle()}</h1>
              </div>
              {renderSubContent(mobileSub)}
            </>
          )
        ) : (
          // Desktop: Two-level tabs
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

              <TabsContent value="general">{renderDesktopGroupContent("general")}</TabsContent>
              <TabsContent value="security">{renderDesktopGroupContent("security")}</TabsContent>
              {canManageTeam && <TabsContent value="team">{renderDesktopGroupContent("team")}</TabsContent>}
              {canManageIntegrations && <TabsContent value="products">{renderDesktopGroupContent("products")}</TabsContent>}
              {canManageIntegrations && <TabsContent value="finance">{renderDesktopGroupContent("finance")}</TabsContent>}
              <TabsContent value="notifications">{renderDesktopGroupContent("notifications")}</TabsContent>
              {canManageIntegrations && <TabsContent value="integrations">{renderDesktopGroupContent("integrations")}</TabsContent>}
            </Tabs>
          </>
        )}
      </div>
    </AppLayout>
  );
}
