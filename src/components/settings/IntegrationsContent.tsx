import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Webhook, Send, Loader2, Eye, EyeOff, MessageCircle, Mail, Receipt, ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface IntegrationsContentProps {
  isLoadingIntegrations: boolean;
  webhookUrl: string;
  setWebhookUrl: (value: string) => void;
  isValidUrl: (url: string) => boolean;
  handleTestWebhook: () => void;
  handleSaveWebhook: () => void;
  testWebhookIsPending: boolean;
  updateOrganizationIsPending: boolean;
  whatsappBaseUrl: string;
  setWhatsappBaseUrl: (value: string) => void;
  whatsappInstance: string;
  setWhatsappInstance: (value: string) => void;
  whatsappApiKey: string;
  setWhatsappApiKey: (value: string) => void;
  showWhatsappApiKey: boolean;
  setShowWhatsappApiKey: (value: boolean) => void;
  handleSaveWhatsApp: () => void;
  brevoApiKey: string;
  setBrevoApiKey: (value: string) => void;
  brevoSenderEmail: string;
  setBrevoSenderEmail: (value: string) => void;
  showBrevoApiKey: boolean;
  setShowBrevoApiKey: (value: boolean) => void;
  handleSaveBrevo: () => void;
  invoiceXpressAccountName: string;
  setInvoiceXpressAccountName: (value: string) => void;
  invoiceXpressApiKey: string;
  setInvoiceXpressApiKey: (value: string) => void;
  showInvoiceXpressApiKey: boolean;
  setShowInvoiceXpressApiKey: (value: boolean) => void;
  handleSaveInvoiceXpress: () => void;
  integrationsEnabled: Record<string, boolean>;
  onToggleIntegration: (key: string, enabled: boolean) => void;
  keyinvoiceApiKey: string;
  setKeyinvoiceApiKey: (value: string) => void;
  keyinvoiceApiUrl: string;
  setKeyinvoiceApiUrl: (value: string) => void;
  showKeyinvoiceApiKey: boolean;
  setShowKeyinvoiceApiKey: (value: boolean) => void;
  handleSaveKeyInvoice: () => void;
}

type IntegrationKey = 'webhook' | 'whatsapp' | 'brevo' | 'invoicexpress' | 'keyinvoice';

interface IntegrationDef {
  key: IntegrationKey;
  icon: LucideIcon;
  title: string;
  description: string;
  toggleKey: string;
  group: string;
}

const integrationGroups = ['Automações', 'Comunicações', 'Faturação'] as const;

const integrations: IntegrationDef[] = [
  { key: 'webhook', icon: Webhook, title: 'n8n / Automações', description: 'Notificações de novos leads', toggleKey: 'webhook', group: 'Automações' },
  { key: 'whatsapp', icon: MessageCircle, title: 'WhatsApp Business', description: 'Integração com Evolution API', toggleKey: 'whatsapp', group: 'Comunicações' },
  { key: 'brevo', icon: Mail, title: 'Email (Brevo)', description: 'Envio de emails e propostas', toggleKey: 'brevo', group: 'Comunicações' },
  { key: 'invoicexpress', icon: Receipt, title: 'InvoiceXpress', description: 'Emissão de faturas automática', toggleKey: 'invoicexpress', group: 'Faturação' },
  { key: 'keyinvoice', icon: Receipt, title: 'KeyInvoice', description: 'Faturação via API 5.0', toggleKey: 'keyinvoice', group: 'Faturação' },
];

function IntegrationCard({ 
  icon: Icon, title, description, badge, onClick 
}: { 
  icon: LucideIcon; title: string; description: string; 
  badge: React.ReactNode; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-lg border bg-card",
        "hover:bg-accent/50 cursor-pointer transition-colors text-left"
      )}
    >
      <div className="rounded-md bg-primary/10 p-2 shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export const IntegrationsContent = (props: IntegrationsContentProps) => {
  const [active, setActive] = useState<IntegrationKey | null>(null);

  const {
    isLoadingIntegrations, webhookUrl, setWebhookUrl, isValidUrl,
    handleTestWebhook, handleSaveWebhook, testWebhookIsPending, updateOrganizationIsPending,
    whatsappBaseUrl, setWhatsappBaseUrl, whatsappInstance, setWhatsappInstance,
    whatsappApiKey, setWhatsappApiKey, showWhatsappApiKey, setShowWhatsappApiKey, handleSaveWhatsApp,
    brevoApiKey, setBrevoApiKey, brevoSenderEmail, setBrevoSenderEmail,
    showBrevoApiKey, setShowBrevoApiKey, handleSaveBrevo,
    invoiceXpressAccountName, setInvoiceXpressAccountName, invoiceXpressApiKey, setInvoiceXpressApiKey,
    showInvoiceXpressApiKey, setShowInvoiceXpressApiKey, handleSaveInvoiceXpress,
    integrationsEnabled, onToggleIntegration,
    keyinvoiceApiKey, setKeyinvoiceApiKey, keyinvoiceApiUrl, setKeyinvoiceApiUrl,
    showKeyinvoiceApiKey, setShowKeyinvoiceApiKey, handleSaveKeyInvoice,
  } = props;

  const isConfigured = (key: IntegrationKey): boolean => {
    switch (key) {
      case 'webhook': return !!webhookUrl;
      case 'whatsapp': return !!(whatsappBaseUrl && whatsappInstance && whatsappApiKey);
      case 'brevo': return !!(brevoApiKey && brevoSenderEmail);
      case 'invoicexpress': return !!(invoiceXpressAccountName && invoiceXpressApiKey);
      case 'keyinvoice': return !!keyinvoiceApiKey;
    }
  };

  const getBadge = (key: string, configured: boolean) => {
    if (integrationsEnabled[key] === false) {
      return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-[10px]">Desativado</Badge>;
    }
    if (configured) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Configurado</Badge>;
    }
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">Não configurado</Badge>;
  };

  const activeIntegration = integrations.find(i => i.key === active);

  // Grid de cards
  if (!active) {
    return (
      <div className="max-w-4xl">
        <div className="mb-4 p-4 rounded-lg bg-muted/50 border">
          <p className="text-sm text-muted-foreground">
            💡 <strong>Dica:</strong> Os modelos de mensagem, regras de IA e Meta Pixels são agora configurados individualmente em cada formulário.
          </p>
        </div>
        <div className="space-y-6">
          {integrationGroups.map((group) => {
            const items = integrations.filter(i => i.group === group);
            return (
              <div key={group}>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">{group}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((item) => (
                    <IntegrationCard
                      key={item.key}
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                      badge={getBadge(item.toggleKey, isConfigured(item.key))}
                      onClick={() => setActive(item.key)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Detail view
  return (
    <div className="max-w-4xl">
      <button
        onClick={() => setActive(null)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {activeIntegration && (
            <div className="rounded-md bg-primary/10 p-2">
              <activeIntegration.icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h3 className="font-medium">{activeIntegration?.title}</h3>
            <p className="text-xs text-muted-foreground">{activeIntegration?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getBadge(active, isConfigured(active))}
          <Switch
            checked={active === 'keyinvoice' ? integrationsEnabled.keyinvoice === true : integrationsEnabled[active] !== false}
            onCheckedChange={(checked) => onToggleIntegration(active, checked)}
          />
        </div>
      </div>

      {isLoadingIntegrations ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">A carregar...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {active === 'webhook' && <WebhookForm {...props} />}
          {active === 'whatsapp' && <WhatsAppForm {...props} />}
          {active === 'brevo' && <BrevoForm {...props} />}
          {active === 'invoicexpress' && <InvoiceXpressForm {...props} />}
          {active === 'keyinvoice' && <KeyInvoiceForm {...props} />}
        </div>
      )}
    </div>
  );
};

// --- Form sub-components ---

function WebhookForm({ webhookUrl, setWebhookUrl, isValidUrl, handleTestWebhook, handleSaveWebhook, testWebhookIsPending, updateOrganizationIsPending }: IntegrationsContentProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="webhook-url">URL do Webhook</Label>
        <Input id="webhook-url" type="url" placeholder="https://seu-n8n.com/webhook/..." value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className={!isValidUrl(webhookUrl) ? 'border-destructive' : ''} />
        {!isValidUrl(webhookUrl) && <p className="text-xs text-destructive">URL inválido</p>}
        <p className="text-xs text-muted-foreground">O webhook receberá um POST com os dados do lead sempre que um novo contacto for registado.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleTestWebhook} disabled={!webhookUrl.trim() || !isValidUrl(webhookUrl) || testWebhookIsPending}>
          {testWebhookIsPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          Testar Webhook
        </Button>
        <Button onClick={handleSaveWebhook} disabled={!isValidUrl(webhookUrl) || updateOrganizationIsPending}>
          {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </div>
    </>
  );
}

function WhatsAppForm({ whatsappBaseUrl, setWhatsappBaseUrl, whatsappInstance, setWhatsappInstance, whatsappApiKey, setWhatsappApiKey, showWhatsappApiKey, setShowWhatsappApiKey, handleSaveWhatsApp, updateOrganizationIsPending }: IntegrationsContentProps) {
  return (
    <>
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
        <p className="text-sm text-amber-600 dark:text-amber-400">Dados de conexão da Instância do WhatsApp deste cliente.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp-base-url">URL do Servidor</Label>
        <Input id="whatsapp-base-url" type="url" placeholder="https://api.senvia.com" value={whatsappBaseUrl} onChange={(e) => setWhatsappBaseUrl(e.target.value)} />
        <p className="text-xs text-muted-foreground">Endereço do seu servidor Evolution API.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp-instance">Nome da Instância</Label>
        <Input id="whatsapp-instance" placeholder="nome-da-instancia" value={whatsappInstance} onChange={(e) => setWhatsappInstance(e.target.value)} />
        <p className="text-xs text-muted-foreground">Nome da instância configurada na Evolution API.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="whatsapp-api-key">API Key da Instância</Label>
        <div className="relative">
          <Input id="whatsapp-api-key" type={showWhatsappApiKey ? 'text' : 'password'} placeholder="Chave de autenticação" value={whatsappApiKey} onChange={(e) => setWhatsappApiKey(e.target.value)} />
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowWhatsappApiKey(!showWhatsappApiKey)}>
            {showWhatsappApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Chave de autenticação da Evolution API.</p>
      </div>
      <Button onClick={handleSaveWhatsApp} disabled={updateOrganizationIsPending}>
        {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar
      </Button>
    </>
  );
}

function BrevoForm({ brevoApiKey, setBrevoApiKey, brevoSenderEmail, setBrevoSenderEmail, showBrevoApiKey, setShowBrevoApiKey, handleSaveBrevo, updateOrganizationIsPending }: IntegrationsContentProps) {
  return (
    <>
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
        <p className="text-sm text-amber-600 dark:text-amber-400">O email remetente deve estar verificado na sua conta Brevo para o envio funcionar.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="brevo-sender-email">Email Remetente</Label>
        <Input id="brevo-sender-email" type="email" placeholder="comercial@minhaempresa.pt" value={brevoSenderEmail} onChange={(e) => setBrevoSenderEmail(e.target.value)} />
        <p className="text-xs text-muted-foreground">Email verificado no Brevo que aparecerá como remetente.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="brevo-api-key">API Key do Brevo</Label>
        <div className="relative">
          <Input id="brevo-api-key" type={showBrevoApiKey ? 'text' : 'password'} placeholder="xkeysib-..." value={brevoApiKey} onChange={(e) => setBrevoApiKey(e.target.value)} />
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowBrevoApiKey(!showBrevoApiKey)}>
            {showBrevoApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Encontre a sua API Key em Brevo → Definições → API Keys.</p>
      </div>
      <div className="space-y-2">
        <Label>Webhook URL (Tracking)</Label>
        <div className="flex items-center gap-2">
          <Input readOnly value="https://zppcobirzgpfcrnxznwe.supabase.co/functions/v1/brevo-webhook" className="text-xs font-mono bg-muted" />
          <Button type="button" variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText("https://zppcobirzgpfcrnxznwe.supabase.co/functions/v1/brevo-webhook"); }}>
            Copiar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Cole este URL no painel do Brevo → Definições → Webhooks para ativar tracking de entregas, aberturas e cliques.</p>
      </div>
      <Button onClick={handleSaveBrevo} disabled={updateOrganizationIsPending}>
        {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar
      </Button>
    </>
  );
}

function InvoiceXpressForm({ invoiceXpressAccountName, setInvoiceXpressAccountName, invoiceXpressApiKey, setInvoiceXpressApiKey, showInvoiceXpressApiKey, setShowInvoiceXpressApiKey, handleSaveInvoiceXpress, updateOrganizationIsPending }: IntegrationsContentProps) {
  return (
    <>
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
        <p className="text-sm text-amber-600 dark:text-amber-400">Encontre estas credenciais em InvoiceXpress → Conta → Integrações → API.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ix-account-name">Account Name</Label>
        <Input id="ix-account-name" placeholder="minhaempresa" value={invoiceXpressAccountName} onChange={(e) => setInvoiceXpressAccountName(e.target.value)} />
        <p className="text-xs text-muted-foreground">Subdomínio da sua conta InvoiceXpress (ex: minhaempresa.app.invoicexpress.com).</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ix-api-key">API Key</Label>
        <div className="relative">
          <Input id="ix-api-key" type={showInvoiceXpressApiKey ? 'text' : 'password'} placeholder="Chave de autenticação" value={invoiceXpressApiKey} onChange={(e) => setInvoiceXpressApiKey(e.target.value)} />
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowInvoiceXpressApiKey(!showInvoiceXpressApiKey)}>
            {showInvoiceXpressApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Chave de autenticação da API InvoiceXpress.</p>
      </div>
      <Button onClick={handleSaveInvoiceXpress} disabled={updateOrganizationIsPending}>
        {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar
      </Button>
    </>
  );
}

function KeyInvoiceForm({ keyinvoiceApiKey, setKeyinvoiceApiKey, keyinvoiceApiUrl, setKeyinvoiceApiUrl, showKeyinvoiceApiKey, setShowKeyinvoiceApiKey, handleSaveKeyInvoice, updateOrganizationIsPending }: IntegrationsContentProps) {
  return (
    <>
      <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
        <p className="text-sm text-blue-600 dark:text-blue-400">Introduza a Chave da API 5.0 do seu painel KeyInvoice.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ki-api-key">Chave da API</Label>
        <div className="relative">
          <Input id="ki-api-key" type={showKeyinvoiceApiKey ? 'text' : 'password'} placeholder="Chave da API KeyInvoice" value={keyinvoiceApiKey} onChange={(e) => setKeyinvoiceApiKey(e.target.value)} />
          <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3" onClick={() => setShowKeyinvoiceApiKey(!showKeyinvoiceApiKey)}>
            {showKeyinvoiceApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Encontre a sua Chave em KeyInvoice → Painel → API 5.0 REST.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="ki-api-url">URL da API</Label>
        <Input id="ki-api-url" type="url" placeholder="https://login.keyinvoice.com/API5.php" value={keyinvoiceApiUrl} onChange={(e) => setKeyinvoiceApiUrl(e.target.value)} />
        <p className="text-xs text-muted-foreground">Endereço base da API KeyInvoice. Deixe em branco para usar o valor padrão.</p>
      </div>
      <Button onClick={handleSaveKeyInvoice} disabled={updateOrganizationIsPending}>
        {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar
      </Button>
    </>
  );
}
