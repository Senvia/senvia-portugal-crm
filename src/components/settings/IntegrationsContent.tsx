import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Copy, ExternalLink, Code, Webhook, Send, Loader2, Check, Eye, EyeOff, MessageCircle, Brain, MessageSquareText, Target, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { MetaPixel } from "@/types";

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
  msgTemplateHot: string;
  setMsgTemplateHot: (value: string) => void;
  msgTemplateWarm: string;
  setMsgTemplateWarm: (value: string) => void;
  msgTemplateCold: string;
  setMsgTemplateCold: (value: string) => void;
  handleSaveMessageTemplates: () => void;
  aiQualificationRules: string;
  setAiQualificationRules: (value: string) => void;
  handleSaveAiRules: () => void;
  metaPixels: MetaPixel[];
  handleAddPixel: () => void;
  handleRemovePixel: (id: string) => void;
  handleUpdatePixel: (id: string, field: keyof MetaPixel, value: string | boolean) => void;
  isValidPixelId: (pixelId: string) => boolean;
  handleSaveMetaPixels: () => void;
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
  msgTemplateHot,
  setMsgTemplateHot,
  msgTemplateWarm,
  setMsgTemplateWarm,
  msgTemplateCold,
  setMsgTemplateCold,
  handleSaveMessageTemplates,
  aiQualificationRules,
  setAiQualificationRules,
  handleSaveAiRules,
  metaPixels,
  handleAddPixel,
  handleRemovePixel,
  handleUpdatePixel,
  isValidPixelId,
  handleSaveMetaPixels,
}: IntegrationsContentProps) => (
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
                  disabled={updateOrganizationIsPending}
                >
                  {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                    disabled={updateOrganizationIsPending}
                  >
                    {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
