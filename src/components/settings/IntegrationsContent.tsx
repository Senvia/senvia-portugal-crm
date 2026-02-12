import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, ExternalLink, Code, Webhook, Send, Loader2, Check, Eye, EyeOff, MessageCircle, Mail, Receipt } from "lucide-react";

interface IntegrationsContentProps {
  organization: {
    public_key: string;
  } | null;
  publicFormUrl: string;
  iframeCode: string;
  copied: string | null;
  copyToClipboard: (text: string, label: string) => void;
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
  taxRate: string;
  setTaxRate: (value: string) => void;
  taxExemptionReason: string;
  setTaxExemptionReason: (value: string) => void;
  integrationsEnabled: Record<string, boolean>;
  onToggleIntegration: (key: string, enabled: boolean) => void;
  // KeyInvoice props (API 5.0 - single API key)
  keyinvoiceApiKey: string;
  setKeyinvoiceApiKey: (value: string) => void;
  keyinvoiceApiUrl: string;
  setKeyinvoiceApiUrl: (value: string) => void;
  showKeyinvoiceApiKey: boolean;
  setShowKeyinvoiceApiKey: (value: boolean) => void;
  handleSaveKeyInvoice: () => void;
}

export const IntegrationsContent = ({
  organization,
  publicFormUrl,
  iframeCode,
  copied,
  copyToClipboard,
  isLoadingIntegrations,
  webhookUrl,
  setWebhookUrl,
  isValidUrl,
  handleTestWebhook,
  handleSaveWebhook,
  testWebhookIsPending,
  updateOrganizationIsPending,
  whatsappBaseUrl,
  setWhatsappBaseUrl,
  whatsappInstance,
  setWhatsappInstance,
  whatsappApiKey,
  setWhatsappApiKey,
  showWhatsappApiKey,
  setShowWhatsappApiKey,
  handleSaveWhatsApp,
  brevoApiKey,
  setBrevoApiKey,
  brevoSenderEmail,
  setBrevoSenderEmail,
  showBrevoApiKey,
  setShowBrevoApiKey,
  handleSaveBrevo,
  invoiceXpressAccountName,
  setInvoiceXpressAccountName,
  invoiceXpressApiKey,
  setInvoiceXpressApiKey,
  showInvoiceXpressApiKey,
  setShowInvoiceXpressApiKey,
  handleSaveInvoiceXpress,
  taxRate,
  setTaxRate,
  taxExemptionReason,
  setTaxExemptionReason,
  integrationsEnabled,
  onToggleIntegration,
  keyinvoiceApiKey,
  setKeyinvoiceApiKey,
  keyinvoiceApiUrl,
  setKeyinvoiceApiUrl,
  showKeyinvoiceApiKey,
  setShowKeyinvoiceApiKey,
  handleSaveKeyInvoice,
}: IntegrationsContentProps) => {
  const getBadge = (key: string, hasCredentials: boolean) => {
    if (integrationsEnabled[key] === false) {
      return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border">Desativado</Badge>;
    }
    if (hasCredentials) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Configurado</Badge>;
    }
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Não configurado</Badge>;
  };

  return (
  <div className="max-w-4xl">
    <div className="mb-4 p-4 rounded-lg bg-muted/50 border">
      <p className="text-sm text-muted-foreground">
        💡 <strong>Dica:</strong> Os modelos de mensagem, regras de IA e Meta Pixels são agora configurados individualmente em cada formulário.
      </p>
    </div>
    
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
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                <span className="font-medium">Webhook (n8n / Automações)</span>
                {getBadge('webhook', !!webhookUrl)}
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Receba notificações em tempo real quando um novo lead é criado.
              </span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={integrationsEnabled.webhook !== false}
                onCheckedChange={(checked) => onToggleIntegration('webhook', checked)}
              />
            </div>
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
                    disabled={!webhookUrl.trim() || !isValidUrl(webhookUrl) || testWebhookIsPending}
                  >
                    {testWebhookIsPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Testar Webhook
                  </Button>
                  <Button
                    onClick={handleSaveWebhook}
                    disabled={!isValidUrl(webhookUrl) || updateOrganizationIsPending}
                  >
                    {updateOrganizationIsPending ? (
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
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-medium">WhatsApp Business</span>
                {getBadge('whatsapp', !!(whatsappBaseUrl && whatsappInstance && whatsappApiKey))}
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Configure a integração com Evolution API.
              </span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={integrationsEnabled.whatsapp !== false}
                onCheckedChange={(checked) => onToggleIntegration('whatsapp', checked)}
              />
            </div>
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
                  disabled={updateOrganizationIsPending}
                >
                  {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Email (Brevo) */}
      <AccordionItem value="brevo">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                <span className="font-medium">Email (Brevo)</span>
                {getBadge('brevo', !!(brevoApiKey && brevoSenderEmail))}
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Configure o envio de emails com a sua conta Brevo.
              </span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={integrationsEnabled.brevo !== false}
                onCheckedChange={(checked) => onToggleIntegration('brevo', checked)}
              />
            </div>
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
                    O email remetente deve estar verificado na sua conta Brevo para o envio funcionar.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brevo-sender-email">Email Remetente</Label>
                  <Input
                    id="brevo-sender-email"
                    type="email"
                    placeholder="comercial@minhaempresa.pt"
                    value={brevoSenderEmail}
                    onChange={(e) => setBrevoSenderEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Email verificado no Brevo que aparecerá como remetente.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brevo-api-key">API Key do Brevo</Label>
                  <div className="relative">
                    <Input
                      id="brevo-api-key"
                      type={showBrevoApiKey ? 'text' : 'password'}
                      placeholder="xkeysib-..."
                      value={brevoApiKey}
                      onChange={(e) => setBrevoApiKey(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowBrevoApiKey(!showBrevoApiKey)}
                    >
                      {showBrevoApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Encontre a sua API Key em Brevo → Definições → API Keys.
                  </p>
                </div>

                <Button
                  onClick={handleSaveBrevo}
                  disabled={updateOrganizationIsPending}
                >
                  {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Faturação (InvoiceXpress) */}
      <AccordionItem value="invoicexpress">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                <span className="font-medium">Faturação (InvoiceXpress)</span>
                {getBadge('invoicexpress', !!(invoiceXpressAccountName && invoiceXpressApiKey))}
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Emita faturas via InvoiceXpress.
              </span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={integrationsEnabled.invoicexpress !== false}
                onCheckedChange={(checked) => onToggleIntegration('invoicexpress', checked)}
              />
            </div>
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
                    Encontre estas credenciais em InvoiceXpress → Conta → Integrações → API.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ix-account-name">Account Name</Label>
                  <Input
                    id="ix-account-name"
                    placeholder="minhaempresa"
                    value={invoiceXpressAccountName}
                    onChange={(e) => setInvoiceXpressAccountName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Subdomínio da sua conta InvoiceXpress (ex: minhaempresa.app.invoicexpress.com).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ix-api-key">API Key</Label>
                  <div className="relative">
                    <Input
                      id="ix-api-key"
                      type={showInvoiceXpressApiKey ? 'text' : 'password'}
                      placeholder="Chave de autenticação"
                      value={invoiceXpressApiKey}
                      onChange={(e) => setInvoiceXpressApiKey(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowInvoiceXpressApiKey(!showInvoiceXpressApiKey)}
                    >
                      {showInvoiceXpressApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chave de autenticação da API InvoiceXpress.
                  </p>
                </div>

                <Separator />

                {/* Configuração Fiscal (partilhada) */}
                <div className="space-y-2">
                  <Label>Taxa de IVA</Label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="23">IVA 23%</option>
                    <option value="13">IVA 13%</option>
                    <option value="6">IVA 6%</option>
                    <option value="0">Isento de IVA</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Taxa de imposto aplicada nas faturas emitidas.
                  </p>
                </div>

                {taxRate === '0' && (
                  <div className="space-y-2">
                    <Label>Motivo de Isenção (AT)</Label>
                    <select
                      value={taxExemptionReason}
                      onChange={(e) => setTaxExemptionReason(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Selecione o motivo...</option>
                      <option value="M01">M01 - Artigo 16.º n.º 6 do CIVA</option>
                      <option value="M02">M02 - Artigo 6.º do Decreto-Lei n.º 198/90</option>
                      <option value="M04">M04 - Isento Artigo 13.º do CIVA</option>
                      <option value="M05">M05 - Isento Artigo 14.º do CIVA</option>
                      <option value="M06">M06 - Isento Artigo 15.º do CIVA</option>
                      <option value="M07">M07 - Isento Artigo 9.º do CIVA</option>
                      <option value="M09">M09 - IVA não confere direito a dedução</option>
                      <option value="M10">M10 - IVA regime de isenção (Art. 53.º)</option>
                      <option value="M11">M11 - Regime particular do tabaco</option>
                      <option value="M12">M12 - Regime da margem de lucro</option>
                      <option value="M13">M13 - Regime de IVA de Caixa</option>
                      <option value="M16">M16 - Isento Artigo 14.º do RITI</option>
                    </select>
                    {!taxExemptionReason && (
                      <p className="text-xs text-destructive">
                        Obrigatório para emissão de faturas isentas de IVA.
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleSaveInvoiceXpress}
                  disabled={updateOrganizationIsPending}
                >
                  {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Faturação (KeyInvoice) */}
      <AccordionItem value="keyinvoice">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                <span className="font-medium">Faturação (KeyInvoice)</span>
                {getBadge('keyinvoice', !!keyinvoiceApiKey)}
              </div>
              <span className="text-xs text-muted-foreground font-normal">
                Emita faturas via KeyInvoice (API 5.0).
              </span>
            </div>
            <div onClick={(e) => e.stopPropagation()}>
              <Switch
                checked={integrationsEnabled.keyinvoice === true}
                onCheckedChange={(checked) => onToggleIntegration('keyinvoice', checked)}
              />
            </div>
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
                    Introduza a Chave da API 5.0 do seu painel KeyInvoice.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ki-api-key">Chave da API</Label>
                  <div className="relative">
                    <Input
                      id="ki-api-key"
                      type={showKeyinvoiceApiKey ? 'text' : 'password'}
                      placeholder="Chave da API KeyInvoice"
                      value={keyinvoiceApiKey}
                      onChange={(e) => setKeyinvoiceApiKey(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowKeyinvoiceApiKey(!showKeyinvoiceApiKey)}
                    >
                      {showKeyinvoiceApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Encontre a sua Chave em KeyInvoice → Painel → API 5.0 REST.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ki-api-url">URL da API</Label>
                  <Input
                    id="ki-api-url"
                    type="url"
                    placeholder="https://login.keyinvoice.com/API5.php"
                    value={keyinvoiceApiUrl}
                    onChange={(e) => setKeyinvoiceApiUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Endereço base da API KeyInvoice. Deixe em branco para usar o valor padrão.
                  </p>
                </div>

                <Separator />

                {/* Configuração Fiscal (partilhada) */}
                <div className="space-y-2">
                  <Label>Taxa de IVA</Label>
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="23">IVA 23%</option>
                    <option value="13">IVA 13%</option>
                    <option value="6">IVA 6%</option>
                    <option value="0">Isento de IVA</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Taxa de imposto aplicada nas faturas emitidas.
                  </p>
                </div>

                {taxRate === '0' && (
                  <div className="space-y-2">
                    <Label>Motivo de Isenção (AT)</Label>
                    <select
                      value={taxExemptionReason}
                      onChange={(e) => setTaxExemptionReason(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Selecione o motivo...</option>
                      <option value="M01">M01 - Artigo 16.º n.º 6 do CIVA</option>
                      <option value="M02">M02 - Artigo 6.º do Decreto-Lei n.º 198/90</option>
                      <option value="M04">M04 - Isento Artigo 13.º do CIVA</option>
                      <option value="M05">M05 - Isento Artigo 14.º do CIVA</option>
                      <option value="M06">M06 - Isento Artigo 15.º do CIVA</option>
                      <option value="M07">M07 - Isento Artigo 9.º do CIVA</option>
                      <option value="M09">M09 - IVA não confere direito a dedução</option>
                      <option value="M10">M10 - IVA regime de isenção (Art. 53.º)</option>
                      <option value="M11">M11 - Regime particular do tabaco</option>
                      <option value="M12">M12 - Regime da margem de lucro</option>
                      <option value="M13">M13 - Regime de IVA de Caixa</option>
                      <option value="M16">M16 - Isento Artigo 14.º do RITI</option>
                    </select>
                    {!taxExemptionReason && (
                      <p className="text-xs text-destructive">
                        Obrigatório para emissão de faturas isentas de IVA.
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleSaveKeyInvoice}
                  disabled={updateOrganizationIsPending}
                >
                  {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar
                </Button>
              </>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </div>
);
};
