import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, ExternalLink, Code, Webhook, Send, Loader2, Check, Eye, EyeOff, MessageCircle, Mail } from "lucide-react";

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
}: IntegrationsContentProps) => (
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
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <span className="font-medium">Email (Brevo)</span>
            </div>
            <span className="text-xs text-muted-foreground font-normal">
              Configure o envio de emails com a sua conta Brevo.
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
    </Accordion>
  </div>
);
