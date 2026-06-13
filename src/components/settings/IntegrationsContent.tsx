import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Webhook, Send, Loader2, Eye, EyeOff, MessageCircle, Mail, Receipt, ArrowLeft, ChevronRight, ChevronDown, Plus, Trash2, Link2, Copy, Check, Users, RefreshCw, Pencil, CheckCircle2, ShieldCheck, Inbox, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOrganizationWebhooks, useCreateWebhook, useToggleWebhook, useDeleteWebhook, OrganizationWebhook } from "@/hooks/useOrganizationWebhooks";
import { useLeadIntakeWebhooks, useCreateLeadIntakeWebhook, useUpdateLeadIntakeWebhook, useDeleteLeadIntakeWebhook, LeadIntakeWebhook } from "@/hooks/useLeadIntakeWebhooks";
import { useTeamMembers } from "@/hooks/useTeam";
import { useTestWebhook } from "@/hooks/useOrganization";
import { useMessagingChannels, useDeleteChannel, useCleanupOrphanChannels } from "@/hooks/useMessagingChannels";
import { ConnectWhatsAppModal } from "./ConnectWhatsAppModal";
import { WhatsAppIcon, InstagramIcon, MessengerIcon } from "./channelIcons";
import { useAuth } from "@/contexts/AuthContext";

interface IntegrationsContentProps {
  isLoadingIntegrations: boolean;
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
  updateOrganizationIsPending: boolean;
  keyinvoiceApiKey: string;
  setKeyinvoiceApiKey: (value: string) => void;
  keyinvoiceApiUrl: string;
  setKeyinvoiceApiUrl: (value: string) => void;
  showKeyinvoiceApiKey: boolean;
  setShowKeyinvoiceApiKey: (value: boolean) => void;
  handleSaveKeyInvoice: () => void;
  // Personal email-sending config (per-user), moved here from the profile so all
  // Brevo/email setup lives in one place. Saved via handleSaveProfile.
  profileSenderEmail: string;
  setProfileSenderEmail: (value: string) => void;
  emailSignature: string;
  setEmailSignature: (value: string) => void;
  handleSaveProfile: () => void;
  updateProfileIsPending: boolean;
}

type IntegrationKey = 'webhook' | 'webhook_inbound' | 'inboxes' | 'brevo' | 'invoicexpress' | 'keyinvoice';

interface IntegrationDef {
  key: IntegrationKey;
  icon: LucideIcon;
  title: string;
  description: string;
  toggleKey: string;
  group: string;
}

const integrationGroups = ['Caixas de Entrada', 'Marketing', 'Automações', 'Faturação eletrónica'] as const;

const integrations: IntegrationDef[] = [
  { key: 'inboxes', icon: Inbox, title: 'Caixas de Entrada', description: 'WhatsApp, Instagram, Facebook e Email num só lugar', toggleKey: 'inboxes', group: 'Caixas de Entrada' },
  { key: 'brevo', icon: Megaphone, title: 'Email Marketing', description: 'Campanhas e automações de email', toggleKey: 'brevo', group: 'Marketing' },
  { key: 'webhook', icon: Webhook, title: 'Webhook de Saída', description: 'Notificar sistemas externos (Make, Zapier, n8n)', toggleKey: 'webhook', group: 'Automações' },
  { key: 'webhook_inbound', icon: Link2, title: 'Webhook de Entrada', description: 'Receber leads (Facebook, Zapier, Make)', toggleKey: 'webhook_inbound', group: 'Automações' },
  { key: 'invoicexpress', icon: Receipt, title: 'InvoiceXpress', description: 'Emissão de faturas automática', toggleKey: 'invoicexpress', group: 'Faturação eletrónica' },
  { key: 'keyinvoice', icon: Receipt, title: 'KeyInvoice', description: 'Faturação via API 5.0', toggleKey: 'keyinvoice', group: 'Faturação eletrónica' },
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
        "w-full flex items-center gap-4 p-5 rounded-lg border bg-card",
        "hover:bg-accent/50 hover:border-primary/30 cursor-pointer transition-colors text-left"
      )}
    >
      <div className="rounded-lg bg-primary/10 p-3 shrink-0">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {badge}
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </div>
    </button>
  );
}

export const IntegrationsContent = (props: IntegrationsContentProps) => {
  const [active, setActive] = useState<IntegrationKey | null>(null);
  const { data: webhooks = [] } = useOrganizationWebhooks();
  const { data: channels = [] } = useMessagingChannels();
  const connectedChannels = channels.filter((c) => c.status === 'connected').length;

  const {
    isLoadingIntegrations,
    brevoApiKey, brevoSenderEmail,
    invoiceXpressAccountName, invoiceXpressApiKey,
    integrationsEnabled, onToggleIntegration,
    keyinvoiceApiKey,
  } = props;

  const visibleIntegrations = integrations;
  const visibleGroups = integrationGroups;
  const showGroupHeaders = true;

  const isConfigured = (key: IntegrationKey): boolean => {
    switch (key) {
      case 'webhook': return webhooks.length > 0;
      case 'webhook_inbound': return true; // Always configured (auto-generated token)
      case 'inboxes': return connectedChannels > 0;
      case 'brevo': return !!(brevoApiKey && brevoSenderEmail);
      case 'invoicexpress': return !!(invoiceXpressAccountName && invoiceXpressApiKey);
      case 'keyinvoice': return !!keyinvoiceApiKey;
    }
  };

  const getBadge = (key: string, configured: boolean) => {
    // Caixas de Entrada has no on/off toggle: show how many channels are connected.
    if (key === 'inboxes') {
      if (connectedChannels > 0) {
        return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">{connectedChannels} {connectedChannels === 1 ? 'ligada' : 'ligadas'}</Badge>;
      }
      return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-[10px]">Nenhuma ligada</Badge>;
    }
    if (integrationsEnabled[key] === false) {
      return <Badge variant="outline" className="bg-muted/50 text-muted-foreground border-border text-[10px]">Desativado</Badge>;
    }
    if (configured) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Configurado</Badge>;
    }
    return <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px]">Não configurado</Badge>;
  };

  const activeIntegration = integrations.find(i => i.key === active);

  if (!active) {
    return (
      <div className="max-w-4xl">
        <div className="space-y-6">
          {visibleGroups.map((group) => {
            const items = visibleIntegrations.filter(i => i.group === group);
            return (
              <div key={group}>
                {showGroupHeaders && (
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">{group}</h3>
                )}
                <div className="grid grid-cols-1 gap-3">
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

  return (
    <div>
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
          {active !== 'inboxes' && (
            <Switch
              checked={active === 'keyinvoice' ? integrationsEnabled.keyinvoice === true : integrationsEnabled[active] !== false}
              onCheckedChange={(checked) => onToggleIntegration(active, checked)}
            />
          )}
        </div>
      </div>

      {isLoadingIntegrations ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">A carregar...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {active === 'webhook' && <WebhooksManager />}
          {active === 'webhook_inbound' && <InboundWebhookSection />}
          {active === 'inboxes' && <InboxesManager />}
          {active === 'brevo' && <BrevoForm {...props} />}
          {active === 'invoicexpress' && <InvoiceXpressForm {...props} />}
          {active === 'keyinvoice' && <KeyInvoiceForm {...props} />}
        </div>
      )}
    </div>
  );
};

// --- Webhooks Manager (replaces single URL input) ---

function WebhooksManager() {
  const { data: webhooks = [], isLoading } = useOrganizationWebhooks();
  const createWebhook = useCreateWebhook();
  const toggleWebhook = useToggleWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const isValidUrl = (url: string) => {
    if (!url) return false;
    try { new URL(url); return true; } catch { return false; }
  };

  const handleAdd = () => {
    if (!newName.trim() || !isValidUrl(newUrl)) return;
    createWebhook.mutate({ name: newName.trim(), url: newUrl.trim() }, {
      onSuccess: () => { setNewName(''); setNewUrl(''); setIsAdding(false); },
    });
  };

  const handleTest = (webhook: OrganizationWebhook) => {
    setTestingId(webhook.id);
    testWebhook.mutate(webhook.url, {
      onSettled: () => setTestingId(null),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">A carregar webhooks...</span>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
      <div className="space-y-4 min-w-0">
      <p className="text-sm text-muted-foreground">
        Envia um POST com os dados de cada novo lead para sistemas externos (Make, Zapier, n8n…).
      </p>

      {/* Webhook list */}
      {webhooks.length > 0 && (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div key={wh.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{wh.name}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{wh.url}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTest(wh)}
                  disabled={testingId === wh.id || !wh.is_active}
                  className="text-xs"
                >
                  {testingId === wh.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
                <Switch
                  checked={wh.is_active}
                  onCheckedChange={(checked) => toggleWebhook.mutate({ id: wh.id, is_active: checked })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteWebhook.mutate(wh.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {webhooks.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <Webhook className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum webhook configurado</p>
        </div>
      )}

      {/* Add form */}
      {isAdding ? (
        <div className="space-y-3 p-4 rounded-lg border bg-muted/30">
          <div className="space-y-2">
            <Label htmlFor="wh-name">Nome</Label>
            <Input id="wh-name" placeholder="Ex: Notificação CRM" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-url">URL</Label>
            <Input id="wh-url" type="url" placeholder="https://..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className={newUrl && !isValidUrl(newUrl) ? 'border-destructive' : ''} />
            {newUrl && !isValidUrl(newUrl) && <p className="text-xs text-destructive">URL inválido</p>}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!newName.trim() || !isValidUrl(newUrl) || createWebhook.isPending}>
              {createWebhook.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Guardar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setIsAdding(false); setNewName(''); setNewUrl(''); }}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Webhook
        </Button>
      )}
      </div>

      {/* Ajuda — coluna direita */}
      <div className="rounded-lg border h-fit">
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-accent/40 transition-colors rounded-lg"
        >
          <span>📋 Como ligar ao Zapier / Make</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showHelp && "rotate-180")} />
        </button>
        {showHelp && (
          <div className="px-4 pb-4 space-y-2 border-t pt-3">
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>No Zapier (trigger <strong>Webhooks → Catch Hook</strong>) ou Make (módulo <strong>Webhooks → Custom webhook</strong>), copia o URL que a ferramenta gera.</li>
              <li>Aqui no Senvia, clica <strong>Adicionar Webhook</strong>, dá um nome e cola esse URL.</li>
              <li>Usa o botão de teste (<Send className="inline h-3 w-3" />) para disparar um lead de exemplo e mapear os campos do lado do Zapier/Make.</li>
              <li>A partir daí, cada novo lead é enviado como <strong>POST JSON</strong> com, entre outros:
                <ul className="ml-4 mt-1 space-y-1 list-disc">
                  <li><code className="bg-muted px-1 rounded text-xs">lead.name</code> · <code className="bg-muted px-1 rounded text-xs">lead.email</code> · <code className="bg-muted px-1 rounded text-xs">lead.phone</code></li>
                  <li><code className="bg-muted px-1 rounded text-xs">lead.company_name</code> · <code className="bg-muted px-1 rounded text-xs">lead.source</code> · <code className="bg-muted px-1 rounded text-xs">lead.status</code></li>
                  <li><code className="bg-muted px-1 rounded text-xs">lead.custom_data</code> (campos do formulário)</li>
                </ul>
              </li>
            </ol>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ O POST não é assinado — o destino deve tratar o endpoint como público.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Inbound Webhook (Zapier/Make) ---

type MemberOption = { user_id: string; full_name: string };

// Seletor de utilizadores: rádio (1 só) quando a rotação está desligada,
// checkboxes (vários) quando está ligada.
function MemberSelector({
  members,
  value,
  rotate,
  onChange,
}: {
  members: MemberOption[];
  value: string[];
  rotate: boolean;
  onChange: (next: string[]) => void;
}) {
  if (members.length === 0) {
    return <p className="text-xs text-muted-foreground">Não há utilizadores na equipa para atribuir.</p>;
  }

  const rowClass = (checked: boolean) =>
    cn(
      "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer transition-colors",
      checked ? "bg-primary/10" : "hover:bg-accent/50"
    );

  if (!rotate) {
    return (
      <RadioGroup
        value={value[0] || ''}
        onValueChange={(v) => onChange([v])}
        className="grid grid-cols-1 sm:grid-cols-2 gap-1.5"
      >
        {members.map((m) => (
          <label key={m.user_id} className={rowClass(value[0] === m.user_id)}>
            <RadioGroupItem value={m.user_id} />
            <span className="text-sm truncate">{m.full_name}</span>
          </label>
        ))}
      </RadioGroup>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
      {members.map((m) => {
        const checked = value.includes(m.user_id);
        return (
          <label key={m.user_id} className={rowClass(checked)}>
            <Checkbox
              checked={checked}
              onCheckedChange={() =>
                onChange(checked ? value.filter((id) => id !== m.user_id) : [...value, m.user_id])
              }
            />
            <span className="text-sm truncate">{m.full_name}</span>
          </label>
        );
      })}
    </div>
  );
}

// Resumo curto para o cabeçalho recolhido do cartão
function assigneeSummary(webhook: LeadIntakeWebhook, members: MemberOption[]): string {
  const ids = webhook.assigned_user_ids || [];
  if (ids.length === 0) return 'Sem responsável';
  if (webhook.rotate_enabled) return `Rotativa · ${ids.length} ${ids.length === 1 ? 'pessoa' : 'pessoas'}`;
  const first = members.find((m) => m.user_id === ids[0]);
  return `Fixo · ${first?.full_name || '1 pessoa'}`;
}

function InboundWebhookSection() {
  const { data: webhooks = [], isLoading } = useLeadIntakeWebhooks();
  const { data: members = [], isLoading: loadingMembers } = useTeamMembers();
  const createWebhook = useCreateLeadIntakeWebhook();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRotate, setNewRotate] = useState(false);
  const [newUsers, setNewUsers] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const memberOptions: MemberOption[] = members.map((m) => ({
    user_id: m.user_id,
    full_name: m.full_name || m.email || 'Sem nome',
  }));

  const resetForm = () => { setNewName(''); setNewRotate(false); setNewUsers([]); setIsAdding(false); };

  // Regras: rotação OFF -> exatamente 1; rotação ON -> pelo menos 2
  const usersValid = newRotate ? newUsers.length >= 2 : newUsers.length === 1;
  const canCreate = !!newName.trim() && usersValid && !createWebhook.isPending;

  const handleAdd = () => {
    if (!canCreate) return;
    createWebhook.mutate(
      { name: newName.trim(), assigned_user_ids: newUsers, rotate_enabled: newRotate },
      { onSuccess: resetForm }
    );
  };

  const handleToggleRotate = (enabled: boolean) => {
    setNewRotate(enabled);
    if (!enabled && newUsers.length > 1) setNewUsers([newUsers[0]]); // mantém só 1
  };

  if (isLoading || loadingMembers) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">A carregar...</span>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:gap-10 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
      <div className="space-y-4 min-w-0">
      <p className="text-sm text-muted-foreground">
        Um link por origem de leads (campanha, parceiro…). Cada um escolhe quem da equipa recebe os contactos.
      </p>

      {/* Lista de webhooks */}
      <div className="space-y-2.5">
        {webhooks.map((wh) => (
          <IntakeWebhookCard key={wh.id} webhook={wh} members={memberOptions} />
        ))}
      </div>

      {webhooks.length === 0 && !isAdding && (
        <div className="text-center py-8 text-muted-foreground">
          <Link2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Ainda não tens webhooks de entrada</p>
        </div>
      )}

      {/* Criação */}
      {isAdding ? (
        <div className="space-y-4 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
          <div className="space-y-2">
            <Label htmlFor="iwh-name">Nome do webhook</Label>
            <Input
              id="iwh-name"
              autoFocus
              placeholder="Ex: Facebook Ads — Campanha Verão"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-sm font-normal flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Distribuição rotativa
              </Label>
              <Switch checked={newRotate} onCheckedChange={handleToggleRotate} />
            </div>
            <p className="text-xs text-muted-foreground">Distribui os leads em rotação entre vários colaboradores (round-robin).</p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {newRotate ? 'Quem recebe os leads (escolhe 2 ou mais)' : 'Quem recebe os leads (escolhe 1)'}
            </Label>
            <MemberSelector members={memberOptions} value={newUsers} rotate={newRotate} onChange={setNewUsers} />
            {!usersValid && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {newRotate ? 'Seleciona pelo menos 2 utilizadores.' : 'Seleciona exatamente 1 utilizador.'}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!canCreate}>
              {createWebhook.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
              Criar webhook
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>Cancelar</Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => setIsAdding(true)} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Webhook de Entrada
        </Button>
      )}
      </div>

      {/* Ajuda — coluna direita */}
      <div className="rounded-lg border h-fit">
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          className="w-full flex items-center justify-between p-3 text-sm font-medium hover:bg-accent/40 transition-colors rounded-lg"
        >
          <span>📋 Como ligar ao Zapier / Make</span>
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showHelp && "rotate-180")} />
        </button>
        {showHelp && (
          <div className="px-4 pb-4 space-y-2 border-t pt-3">
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Cria um cenário/zap com o trigger desejado (Facebook Lead Ads, Google Forms, etc.)</li>
              <li>Adiciona uma ação HTTP <strong>POST</strong> com o URL do webhook (botão Copiar em cada um)</li>
              <li>Body type: <strong>JSON</strong></li>
              <li>Mapeia os campos:
                <ul className="ml-4 mt-1 space-y-1 list-disc">
                  <li><code className="bg-muted px-1 rounded text-xs">name</code> → Nome completo</li>
                  <li><code className="bg-muted px-1 rounded text-xs">email</code> → Email</li>
                  <li><code className="bg-muted px-1 rounded text-xs">phone</code> → Telefone</li>
                  <li><code className="bg-muted px-1 rounded text-xs">company</code> → Empresa (opcional)</li>
                  <li><code className="bg-muted px-1 rounded text-xs">source</code> → Fonte (opcional)</li>
                  <li><code className="bg-muted px-1 rounded text-xs">notes</code> → Notas (opcional)</li>
                </ul>
              </li>
            </ol>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              ⚠️ Não partilhes estes URLs publicamente — cada link autentica a tua organização.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Cartão de um webhook de entrada ---

function IntakeWebhookCard({
  webhook,
  members,
}: {
  webhook: LeadIntakeWebhook;
  members: MemberOption[];
}) {
  const updateWebhook = useUpdateLeadIntakeWebhook();
  const deleteWebhook = useDeleteLeadIntakeWebhook();

  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(webhook.name);

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-lead?mode=webhook&token=${webhook.token}`;
  const selected = webhook.assigned_user_ids || [];

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveName = () => {
    const trimmed = nameDraft.trim();
    setEditingName(false);
    if (trimmed && trimmed !== webhook.name) {
      updateWebhook.mutate({ id: webhook.id, name: trimmed });
    } else {
      setNameDraft(webhook.name);
    }
  };

  const setUsers = (next: string[]) => {
    updateWebhook.mutate({ id: webhook.id, assigned_user_ids: next });
  };

  const toggleRotate = (enabled: boolean) => {
    // Ao desligar a rotação, mantém só 1 utilizador (regra: 1 fixo)
    if (!enabled && selected.length > 1) {
      updateWebhook.mutate({ id: webhook.id, rotate_enabled: false, assigned_user_ids: [selected[0]] });
    } else {
      updateWebhook.mutate({ id: webhook.id, rotate_enabled: enabled });
    }
  };

  // Avisos de validação
  const rotateOffInvalid = !webhook.rotate_enabled && selected.length !== 1;
  const rotateOnHint = webhook.rotate_enabled && selected.length < 2;
  const needsAttention = rotateOffInvalid || (webhook.is_active && selected.length === 0);

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", !webhook.is_active && "opacity-70")}>
      {/* Cabeçalho recolhível — nome editável inline (sem campo Nome duplicado no expandido) */}
      <div className="flex items-center gap-2 p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 shrink-0"
          aria-label={expanded ? 'Recolher' : 'Expandir'}
        >
          <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
          <span className={cn("h-2 w-2 rounded-full", webhook.is_active ? "bg-green-500" : "bg-muted-foreground/40")} />
        </button>

        {editingName ? (
          <Input
            autoFocus
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { setNameDraft(webhook.name); setEditingName(false); } }}
            className="h-8 text-sm flex-1"
          />
        ) : (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
            >
              <span className="text-sm font-medium truncate">{webhook.name}</span>
              {webhook.is_system && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground border rounded px-1.5 py-0.5 shrink-0">
                        <ShieldCheck className="h-3 w-3" /> Predefinido
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[220px]">Webhook base da tua conta. Podes editá-lo ou desativá-lo, mas não eliminá-lo.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {needsAttention && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded px-1.5 py-0.5 shrink-0">
                  ⚠️ Configurar
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setNameDraft(webhook.name); setEditingName(true); }}
              className="p-1 text-muted-foreground hover:text-foreground shrink-0"
              title="Renomear"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </>
        )}

        <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[160px]">
          {assigneeSummary(webhook, members)}
        </span>
        <Switch
          checked={webhook.is_active}
          onCheckedChange={(checked) => updateWebhook.mutate({ id: webhook.id, is_active: checked })}
        />
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t">
          {/* URL */}
          <div className="space-y-1.5">
            <Label className="text-xs">URL do Webhook</Label>
            <div className="flex items-center gap-2">
              <Input readOnly value={url} className="text-xs font-mono bg-muted text-muted-foreground" />
              <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
          </div>

          {/* Distribuição rotativa */}
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm font-normal flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              Distribuição rotativa
            </Label>
            <Switch checked={webhook.rotate_enabled} onCheckedChange={toggleRotate} />
          </div>

          {/* Utilizadores que recebem */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              {webhook.rotate_enabled ? 'Quem recebe os leads (2 ou mais)' : 'Quem recebe os leads (1 pessoa)'}
            </Label>
            <MemberSelector members={members} value={selected} rotate={webhook.rotate_enabled} onChange={setUsers} />

            {rotateOffInvalid ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {selected.length === 0
                  ? '⚠️ Seleciona 1 colaborador, senão o lead fica sem responsável.'
                  : '⚠️ Sem rotação, só pode haver 1 colaborador.'}
              </p>
            ) : rotateOnHint ? (
              <p className="text-xs text-blue-600 dark:text-blue-400">💡 Seleciona pelo menos 2 para a rotação fazer sentido.</p>
            ) : (
              <p className="text-xs text-muted-foreground">Quem recebe é notificado por email/push.</p>
            )}
          </div>

          {/* Notificar todos os admins */}
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-3">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Avisar também os administradores</Label>
                <p className="text-xs text-muted-foreground">
                  {webhook.notify_all_admins
                    ? 'LIGADO: além de quem recebe o lead, todos os administradores recebem o aviso — mesmo que não estejam na lista acima.'
                    : 'DESLIGADO: só quem está selecionado acima recebe o aviso. Os outros administradores não são notificados.'}
                </p>
              </div>
            </div>
            <Switch
              checked={webhook.notify_all_admins}
              onCheckedChange={(checked) => updateWebhook.mutate({ id: webhook.id, notify_all_admins: checked })}
            />
          </div>

          {/* Eliminar (com confirmação) — só webhooks não predefinidos */}
          {!webhook.is_system && (
            <div className="flex justify-end pt-1 border-t">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive mt-3">
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Eliminar webhook
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar "{webhook.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O link deixa de funcionar e qualquer integração externa (Make, Zapier, Facebook…) que o use para de enviar leads. Esta ação não pode ser anulada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteWebhook.mutate(webhook.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Form sub-components ---

// Channel catalog for the "+ Nova caixa" picker. Only WhatsApp is active in
// Phase 1; Instagram/Facebook/Email are shown as coming soon.
type ChannelIcon = React.ComponentType<{ className?: string }>;
const CHANNEL_CATALOG: { type: string; label: string; icon: ChannelIcon; color: string; available: boolean }[] = [
  { type: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon, color: 'text-[#25D366]', available: true },
  { type: 'instagram', label: 'Instagram', icon: InstagramIcon, color: 'text-[#E4405F]', available: false },
  { type: 'facebook', label: 'Facebook Messenger', icon: MessengerIcon, color: 'text-[#0084FF]', available: false },
  { type: 'email', label: 'Email', icon: Mail, color: 'text-muted-foreground', available: false },
];

function channelMeta(type: string) {
  return CHANNEL_CATALOG.find((c) => c.type === type) || { type, label: type, icon: MessageCircle, color: 'text-muted-foreground', available: true };
}

const CHANNEL_STATUS_LABEL: Record<string, string> = {
  connected: 'Ligada',
  connecting: 'A ligar...',
  disconnected: 'Desligada',
  error: 'Erro',
};

// Caixas de Entrada: lists the org's connected channels and lets the admin add a
// new one. Phase 1 supports WhatsApp (Evolution + Chatwoot); other channels are
// surfaced as "em breve" until their providers are wired.
function InboxesManager() {
  const { data: channels = [] } = useMessagingChannels();
  const deleteChannel = useDeleteChannel();
  const cleanupOrphans = useCleanupOrphanChannels();
  const orphanCount = channels.filter((c) => c.status !== 'connected').length;
  // Modal target: reconnect (channelId) or create new (label, no channelId).
  const [modal, setModal] = useState<{ open: boolean; channelId?: string; label?: string }>({ open: false });
  const [picking, setPicking] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [toDelete, setToDelete] = useState<string | null>(null);

  const startNewWhatsApp = () => {
    setModal({ open: true, label: newLabel.trim() || 'WhatsApp' });
    setPicking(false);
    setNewLabel('');
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Liga as tuas contas para receber e responder mensagens de todos os canais dentro do CRM.
      </p>

      {/* Connected channels list */}
      {channels.length > 0 ? (
        <div className="space-y-2">
          {channels.map((ch) => {
            const meta = channelMeta(ch.channel_type);
            const Icon = meta.icon;
            const connected = ch.status === 'connected';
            return (
              <div key={ch.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                <div className={cn('rounded-md p-2 shrink-0', connected ? 'bg-muted' : 'bg-muted opacity-60')}>
                  <Icon className={cn('h-5 w-5', meta.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {ch.label || meta.label}
                    {ch.phone_number ? ` · +${ch.phone_number}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">{meta.label} · {CHANNEL_STATUS_LABEL[ch.status] || ch.status}</p>
                </div>
                {connected && (
                  <Badge variant="outline" className="text-[10px] gap-1 bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle2 className="h-3 w-3" /> Ligada
                  </Badge>
                )}
                {ch.channel_type === 'whatsapp' && (
                  <Button variant="outline" size="sm" onClick={() => setModal({ open: true, channelId: ch.id })} className="shrink-0">
                    {connected ? 'Reconectar' : 'Ligar'}
                  </Button>
                )}
                <button
                  type="button"
                  onClick={() => setToDelete(ch.id)}
                  className="p-1.5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  title="Remover caixa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Inbox className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Ainda não tens nenhuma caixa ligada.</p>
        </div>
      )}

      {/* Add new */}
      {picking ? (
        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground px-1">Escolhe o canal</p>
          <div className="grid grid-cols-2 gap-2">
            {CHANNEL_CATALOG.map((c) => {
              const Icon = c.icon;
              const isWhatsApp = c.type === 'whatsapp';
              return (
                <div
                  key={c.type}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-3',
                    c.available ? '' : 'opacity-50',
                  )}
                >
                  <Icon className={cn('h-5 w-5 shrink-0', c.color)} />
                  <span className="text-sm font-medium min-w-0">
                    {c.label}
                    {!c.available && <span className="block text-[10px] text-muted-foreground font-normal">Em breve</span>}
                  </span>
                </div>
              );
            })}
          </div>
          {/* WhatsApp is the only active channel in Phase 1 */}
          <div className="space-y-2 border-t pt-3">
            <Label htmlFor="new-inbox-label" className="text-xs">Nome da caixa (WhatsApp)</Label>
            <Input
              id="new-inbox-label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex: Vendas, Suporte"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={startNewWhatsApp} className="flex-1">
                <MessageCircle className="mr-2 h-4 w-4" /> Ligar WhatsApp
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setPicking(false); setNewLabel(''); }}>Cancelar</Button>
            </div>
          </div>
        </div>
      ) : (
        <Button onClick={() => setPicking(true)} variant="outline" className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Nova caixa
        </Button>
      )}

      {orphanCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => cleanupOrphans.mutate()}
          disabled={cleanupOrphans.isPending}
          className="w-full text-muted-foreground hover:text-destructive"
        >
          {cleanupOrphans.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Limpar {orphanCount} {orphanCount === 1 ? 'caixa por ligar' : 'caixas por ligar'}
        </Button>
      )}

      <ConnectWhatsAppModal
        open={modal.open}
        onOpenChange={(o) => setModal((m) => ({ ...m, open: o }))}
        channelId={modal.channelId}
        label={modal.label}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover esta caixa?</AlertDialogTitle>
            <AlertDialogDescription>
              A caixa deixa de aparecer no CRM e as mensagens desse canal deixam de ser geridas aqui. Esta ação não pode ser anulada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (toDelete) deleteChannel.mutate(toDelete); setToDelete(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function BrevoForm({ brevoApiKey, setBrevoApiKey, brevoSenderEmail, setBrevoSenderEmail, showBrevoApiKey, setShowBrevoApiKey, handleSaveBrevo, updateOrganizationIsPending, profileSenderEmail, setProfileSenderEmail, emailSignature, setEmailSignature, handleSaveProfile, updateProfileIsPending }: IntegrationsContentProps) {
  return (
    <>
      <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
        <p className="text-sm font-medium flex items-center gap-2"><Megaphone className="h-4 w-4 text-muted-foreground" />Envio de campanhas e automações de email</p>
        <p className="text-xs text-muted-foreground">Atualmente só suportamos o <strong>Brevo</strong> como provedor de email marketing. O email remetente deve estar verificado na tua conta Brevo para o envio funcionar.</p>
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
          <Input readOnly value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brevo-webhook`} className="text-xs font-mono bg-muted" />
          <Button type="button" variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/brevo-webhook`); }}>
            Copiar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Cole este URL no painel do Brevo → Definições → Webhooks para ativar tracking de entregas, aberturas e cliques.</p>
      </div>
      <Button onClick={handleSaveBrevo} disabled={updateOrganizationIsPending}>
        {updateOrganizationIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Guardar
      </Button>

      {/* Personal email-sending config (per-user) — moved here from the profile. */}
      <div className="rounded-lg border p-4 space-y-4 mt-2">
        <div>
          <h4 className="font-medium text-sm flex items-center gap-2"><Mail className="h-4 w-4" />O teu envio de email</h4>
          <p className="text-xs text-muted-foreground mt-0.5">Aplica-se apenas aos emails que <strong>tu</strong> envias. Sobrepõe-se ao remetente da organização.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-brevo-sender">O teu email de envio</Label>
          <Input id="profile-brevo-sender" type="email" placeholder="o-seu-email@dominio.com" value={profileSenderEmail} onChange={(e) => setProfileSenderEmail(e.target.value)} />
          <p className="text-xs text-muted-foreground">Deve estar verificado na Brevo. Se vazio, é usado o email da organização acima.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="profile-signature">A tua assinatura de email</Label>
          <Textarea id="profile-signature" value={emailSignature} onChange={(e) => setEmailSignature(e.target.value)} placeholder="Cole aqui a sua assinatura HTML (nome, cargo, telefone, logo...)" rows={6} className="font-mono text-xs" />
          <p className="text-xs text-muted-foreground">Anexada automaticamente a todos os emails que enviar (templates, marketing, leads).</p>
        </div>
        <Button onClick={handleSaveProfile} disabled={updateProfileIsPending}>
          {updateProfileIsPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </div>
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
