import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Webhook, Send, Loader2, Eye, EyeOff, MessageCircle, Mail, Receipt, ArrowLeft, ChevronRight, ChevronDown, Plus, Trash2, Link2, Copy, Check, Users, RefreshCw, Pencil, CheckCircle2, ShieldCheck, Inbox, Megaphone, PowerOff, Settings2, Zap, UsersRound, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useOrganizationWebhooks, useCreateWebhook, useToggleWebhook, useDeleteWebhook, OrganizationWebhook } from "@/hooks/useOrganizationWebhooks";
import { useLeadIntakeWebhooks, useCreateLeadIntakeWebhook, useUpdateLeadIntakeWebhook, useDeleteLeadIntakeWebhook, LeadIntakeWebhook } from "@/hooks/useLeadIntakeWebhooks";
import { useTeamMembers } from "@/hooks/useTeam";
import { useTestWebhook, useOrganization } from "@/hooks/useOrganization";
import { MetaConversionsForm } from "./MetaConversionsForm";
import { useMessagingChannels, useDeleteChannel, useCleanupOrphanChannels, useUpdateChannelAssignment, useLogoutChannel, useUpdateChannelGroups, useAutoRepairWiring } from "@/hooks/useMessagingChannels";
import { AddEmailModal, EditEmailModal } from "./EmailManager";
import { useDeleteEmailChannel, type EmailChannel } from "@/hooks/useEmailChannels";
import { ConnectWhatsAppModal } from "./ConnectWhatsAppModal";
import { WhatsAppIcon, InstagramIcon, MessengerIcon } from "./channelIcons";
import { CollaboratorPicker } from "./CollaboratorPicker";
import { AssignmentSelector, deriveAssignmentMode, assignmentToFields, type AssignmentMode } from "./AssignmentSelector";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";

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

type IntegrationKey = 'webhook' | 'webhook_inbound' | 'inboxes' | 'brevo' | 'invoicexpress' | 'keyinvoice' | 'meta';

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
  { key: 'inboxes', icon: Inbox, title: 'Caixas de Entrada', description: 'WhatsApp, Instagram, Facebook, Email e mais', toggleKey: 'inboxes', group: 'Caixas de Entrada' },
  { key: 'brevo', icon: Megaphone, title: 'Email Marketing', description: 'Campanhas e automações de email', toggleKey: 'brevo', group: 'Marketing' },
  { key: 'meta', icon: Target, title: 'Meta Ads (Conversões)', description: 'Avisar o Facebook/Instagram Ads quando um lead converte', toggleKey: 'meta', group: 'Marketing' },
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
  const [searchParams] = useSearchParams();

  // Deep link from the empty inbox (?addInbox=1): jump straight into the Caixas de
  // Entrada view. InboxesManager then auto-opens the "Nova caixa" dialog (and
  // clears the param), so the user lands on the chooser in one step.
  useEffect(() => {
    if (searchParams.get('addInbox')) setActive('inboxes');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: webhooks = [] } = useOrganizationWebhooks();
  const { data: channels = [] } = useMessagingChannels();
  const { data: org } = useOrganization();
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
      // Configured-state comes from the org's has_* flags (secrets are write-only now);
      // brevoApiKey etc. props are only used as the input value when entering a new key.
      case 'brevo': return !!((org as any)?.has_brevo_key && brevoSenderEmail);
      case 'invoicexpress': return !!(invoiceXpressAccountName && (org as any)?.has_invoicexpress_key);
      case 'keyinvoice': return !!(org as any)?.has_keyinvoice;
      case 'meta': return !!(org as any)?.has_meta_token;
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
          {active !== 'inboxes' && active !== 'meta' && (
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
          {active === 'meta' && <MetaConversionsForm />}
        </div>
      )}
    </div>
  );
};

// --- Webhooks Manager (outbound) ---

function EditOutboundWebhookModal({ wh, open, onOpenChange, toggleWebhook, deleteWebhook, testWebhook, testingId }: {
  wh: OrganizationWebhook;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  toggleWebhook: ReturnType<typeof useToggleWebhook>;
  deleteWebhook: ReturnType<typeof useDeleteWebhook>;
  testWebhook: ReturnType<typeof useTestWebhook>;
  testingId: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(wh.url); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className="relative px-6 py-5 flex items-center gap-4 bg-violet-500/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 dark:bg-black/30 shrink-0 shadow-sm">
            <Webhook className="h-6 w-6 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold">{wh.name}</DialogTitle>
            <DialogDescription className="text-xs mt-0.5 font-mono truncate">{wh.url}</DialogDescription>
          </div>
          <span className={cn("flex items-center gap-1 text-[10px] font-semibold rounded-full px-2.5 py-1 border shrink-0",
            wh.is_active ? "text-green-700 bg-green-500/20 border-green-500/30" : "text-muted-foreground bg-muted border-border")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", wh.is_active ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50")} />
            {wh.is_active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">URL de destino</Label>
            <div className="flex gap-2">
              <Input readOnly value={wh.url} className="text-xs font-mono bg-muted text-muted-foreground h-9" />
              <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="shrink-0 h-9">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="rounded-xl border divide-y overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10">
                  <Zap className="h-4 w-4 text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Webhook ativo</p>
                  <p className="text-[11px] text-muted-foreground">Envia eventos quando ativo</p>
                </div>
              </div>
              <Switch checked={wh.is_active} onCheckedChange={(c) => toggleWebhook.mutate({ id: wh.id, is_active: c })} />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => testWebhook.mutate(wh.url)} disabled={testingId === wh.id || !wh.is_active}>
              {testingId === wh.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Testar
            </Button>
            {!wh.is_system && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive border-destructive/30 gap-1.5">
                    <Trash2 className="h-4 w-4" /> Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar "{wh.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>O destino deixa de receber eventos. Esta ação não pode ser anulada.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { deleteWebhook.mutate(wh.id); onOpenChange(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WebhooksManager() {
  const { data: webhooks = [], isLoading } = useOrganizationWebhooks();
  const createWebhook = useCreateWebhook();
  const toggleWebhook = useToggleWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();

  const [editWh, setEditWh] = useState<OrganizationWebhook | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [testingId, setTestingId] = useState<string | null>(null);

  const isValidUrl = (url: string) => { try { new URL(url); return true; } catch { return false; } };

  const handleAdd = () => {
    if (!newName.trim() || !isValidUrl(newUrl)) return;
    createWebhook.mutate({ name: newName.trim(), url: newUrl.trim() }, {
      onSuccess: () => { setNewName(''); setNewUrl(''); setNewOpen(false); },
    });
  };

  const handleTest = (wh: OrganizationWebhook) => {
    setTestingId(wh.id);
    testWebhook.mutate(wh.url, { onSettled: () => setTestingId(null) });
  };

  if (isLoading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">A carregar webhooks...</span></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Envia um POST com os dados de cada novo lead para sistemas externos (Make, Zapier, n8n…).</p>
        <Button size="sm" onClick={() => setNewOpen(true)} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" /> Adicionar Webhook
        </Button>
      </div>

      {webhooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {webhooks.map((wh) => (
            <div key={wh.id} className={cn("rounded-2xl border overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col", !wh.is_active && "opacity-70")}>
              <div className="px-4 pt-4 pb-3 flex items-start gap-3 bg-violet-500/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 dark:bg-black/30 shrink-0 shadow-sm">
                  <Webhook className="h-5 w-5 text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{wh.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{wh.url}</p>
                </div>
                {wh.is_active ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-500/20 border border-green-500/30 rounded-full px-2 py-0.5 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Ativo
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" /> Inativo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 border-t border-b text-xs text-muted-foreground bg-muted/10">
                {wh.is_system && <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Predefinido</span>}
                <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> Webhook de saída</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 mt-auto">
                <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8" onClick={() => setEditWh(wh)}>
                  <Settings2 className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => handleTest(wh)} disabled={testingId === wh.id || !wh.is_active}>
                  {testingId === wh.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-10 text-center bg-muted/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 mx-auto mb-3">
            <Webhook className="h-7 w-7 text-violet-500/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Nenhum webhook configurado</p>
          <p className="text-xs text-muted-foreground mt-1">Clica em "Adicionar Webhook" para começar</p>
        </div>
      )}

      {/* Edit modal */}
      {editWh && (
        <EditOutboundWebhookModal wh={editWh} open={!!editWh} onOpenChange={(o) => { if (!o) setEditWh(null); }}
          toggleWebhook={toggleWebhook} deleteWebhook={deleteWebhook} testWebhook={testWebhook} testingId={testingId} />
      )}

      {/* New webhook dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Webhook de Saída</DialogTitle>
            <DialogDescription>Envia eventos para um URL externo (Zapier, Make, n8n…).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-2">
              <Label htmlFor="wh-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome</Label>
              <Input id="wh-name" placeholder="Ex: Notificação CRM" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-url" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">URL de destino</Label>
              <Input id="wh-url" type="url" placeholder="https://..." value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className={newUrl && !isValidUrl(newUrl) ? 'border-destructive' : ''} />
              {newUrl && !isValidUrl(newUrl) && <p className="text-xs text-destructive">URL inválido</p>}
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleAdd} disabled={!newName.trim() || !isValidUrl(newUrl) || createWebhook.isPending} className="flex-1">
                {createWebhook.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
              </Button>
              <Button variant="ghost" onClick={() => { setNewOpen(false); setNewName(''); setNewUrl(''); }}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Help box */}
      <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">📋 Como ligar ao Zapier / Make</p>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>No Zapier ou Make, copia o URL gerado pela ferramenta.</li>
          <li>Aqui, clica <strong>Adicionar Webhook</strong> e cola esse URL.</li>
          <li>Usa o botão <Send className="inline h-3 w-3" /> para disparar um lead de exemplo.</li>
          <li>Cada novo lead é enviado como <strong>POST JSON</strong> com <code className="bg-muted px-1 rounded text-xs">lead.name</code>, <code className="bg-muted px-1 rounded text-xs">lead.email</code>, <code className="bg-muted px-1 rounded text-xs">lead.phone</code>, etc.</li>
        </ol>
        <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ O POST não é assinado — trata o endpoint como público.</p>
      </div>
    </div>
  );
}

// --- Inbound Webhook (Zapier/Make) ---

type MemberOption = { user_id: string; full_name: string };

// Seletor de utilizadores (lista com pesquisa): 1 só quando a rotação está
// desligada, vários quando está ligada.
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
  return (
    <CollaboratorPicker
      members={members}
      value={value}
      onChange={onChange}
      mode={rotate ? 'multi' : 'single'}
    />
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

function IntakeWebhookEditModal({ webhook, members, open, onOpenChange }: {
  webhook: LeadIntakeWebhook; members: MemberOption[]; open: boolean; onOpenChange: (o: boolean) => void;
}) {
  const updateWebhook = useUpdateLeadIntakeWebhook();
  const deleteWebhook = useDeleteLeadIntakeWebhook();
  const [copied, setCopied] = useState(false);
  const [nameDraft, setNameDraft] = useState(webhook.name);
  useEffect(() => { setNameDraft(webhook.name); }, [webhook.name, open]);

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-lead?mode=webhook&token=${webhook.token}`;
  const selected = webhook.assigned_user_ids || [];
  const handleCopy = () => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const assignMode = deriveAssignmentMode(selected, webhook.rotate_enabled);
  const applyAssignment = (mode: AssignmentMode, userIds: string[]) => {
    const f = assignmentToFields(mode, userIds);
    updateWebhook.mutate({ id: webhook.id, assigned_user_ids: f.assigned_user_ids, rotate_enabled: f.rotate_enabled });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className="relative px-6 py-5 flex items-center gap-4 bg-teal-500/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 dark:bg-black/30 shrink-0 shadow-sm">
            <Link2 className="h-6 w-6 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold">{webhook.name}</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">{assigneeSummary(webhook, members)}</DialogDescription>
          </div>
          <span className={cn("flex items-center gap-1 text-[10px] font-semibold rounded-full px-2.5 py-1 border shrink-0",
            webhook.is_active ? "text-green-700 bg-green-500/20 border-green-500/30" : "text-muted-foreground bg-muted border-border")}>
            <span className={cn("h-1.5 w-1.5 rounded-full", webhook.is_active ? "bg-green-500 animate-pulse" : "bg-muted-foreground/50")} />
            {webhook.is_active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome</Label>
            <div className="flex gap-2">
              <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} className="h-9" />
              <Button size="sm" className="h-9" disabled={!nameDraft.trim() || nameDraft.trim() === webhook.name}
                onClick={() => updateWebhook.mutate({ id: webhook.id, name: nameDraft.trim() })}>Guardar</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input readOnly value={url} className="text-xs font-mono bg-muted text-muted-foreground h-9" />
              <Button type="button" variant="outline" size="sm" onClick={handleCopy} className="shrink-0 h-9">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="rounded-xl border divide-y overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/10">
                  <Zap className="h-4 w-4 text-teal-600" />
                </div>
                <div><p className="text-sm font-medium">Webhook ativo</p><p className="text-[11px] text-muted-foreground">Recebe leads quando ativo</p></div>
              </div>
              <Switch checked={webhook.is_active} onCheckedChange={(c) => updateWebhook.mutate({ id: webhook.id, is_active: c })} />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <Mail className="h-4 w-4 text-amber-600" />
                </div>
                <div><p className="text-sm font-medium">Avisar administradores</p><p className="text-[11px] text-muted-foreground">Notifica todos os admins por push/email</p></div>
              </div>
              <Switch checked={webhook.notify_all_admins} onCheckedChange={(c) => updateWebhook.mutate({ id: webhook.id, notify_all_admins: c })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <UsersRound className="h-3.5 w-3.5" /> Atribuição de leads
            </Label>
            <AssignmentSelector
              members={members}
              mode={assignMode}
              userIds={selected}
              noun="leads"
              onChange={({ mode, userIds }) => applyAssignment(mode, userIds)}
            />
          </div>
          {!webhook.is_system && (
            <div className="pt-1 border-t flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar webhook
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar "{webhook.name}"?</AlertDialogTitle>
                    <AlertDialogDescription>O link deixa de funcionar e qualquer integração que o use para de enviar leads. Esta ação não pode ser anulada.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { deleteWebhook.mutate(webhook.id); onOpenChange(false); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InboundWebhookSection() {
  const { data: webhooks = [], isLoading } = useLeadIntakeWebhooks();
  const { data: members = [], isLoading: loadingMembers } = useTeamMembers();
  const createWebhook = useCreateLeadIntakeWebhook();

  const [newOpen, setNewOpen] = useState(false);
  const [editWh, setEditWh] = useState<LeadIntakeWebhook | null>(null);
  const [newName, setNewName] = useState('');
  const [newMode, setNewMode] = useState<AssignmentMode>('rotate');
  const [newUsers, setNewUsers] = useState<string[]>([]);

  const memberOptions: MemberOption[] = members.map((m) => ({ user_id: m.user_id, full_name: m.full_name || m.email || 'Sem nome' }));
  const resetForm = () => { setNewName(''); setNewMode('rotate'); setNewUsers([]); setNewOpen(false); };
  const usersValid = newMode === 'none' ? true : newMode === 'rotate' ? newUsers.length >= 2 : newUsers.length === 1;
  const canCreate = !!newName.trim() && usersValid && !createWebhook.isPending;

  const handleAdd = () => {
    if (!canCreate) return;
    const f = assignmentToFields(newMode, newUsers);
    createWebhook.mutate({ name: newName.trim(), assigned_user_ids: f.assigned_user_ids, rotate_enabled: f.rotate_enabled }, { onSuccess: resetForm });
  };

  if (isLoading || loadingMembers) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /><span className="text-sm">A carregar...</span></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Um link por origem de leads (campanha, parceiro…). Cada um escolhe quem da equipa recebe os contactos.</p>
        <Button size="sm" onClick={() => setNewOpen(true)} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" /> Adicionar Webhook
        </Button>
      </div>

      {webhooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {webhooks.map((wh) => {
            const needsAttention = (!wh.rotate_enabled && (wh.assigned_user_ids || []).length !== 1) || (wh.is_active && (wh.assigned_user_ids || []).length === 0);
            return (
              <div key={wh.id} className={cn("rounded-2xl border overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col", !wh.is_active && "opacity-70")}>
                <div className="px-4 pt-4 pb-3 flex items-start gap-3 bg-teal-500/10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 dark:bg-black/30 shrink-0 shadow-sm">
                    <Link2 className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{wh.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{assigneeSummary(wh, memberOptions)}</p>
                  </div>
                  {wh.is_active ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-500/20 border border-green-500/30 rounded-full px-2 py-0.5 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Ativo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" /> Inativo
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 px-4 py-2.5 border-t border-b text-xs text-muted-foreground bg-muted/10">
                  {wh.rotate_enabled && <span className="flex items-center gap-1 text-blue-600"><RefreshCw className="h-3 w-3" /> Rotação</span>}
                  {wh.notify_all_admins && <span className="flex items-center gap-1 text-amber-600"><Mail className="h-3 w-3" /> Admins</span>}
                  {needsAttention && <span className="flex items-center gap-1 text-amber-600">⚠️ Configurar</span>}
                </div>
                <div className="flex items-center gap-2 px-4 py-3 mt-auto">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8" onClick={() => setEditWh(wh)}>
                    <Settings2 className="h-3.5 w-3.5" /> Editar
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-10 text-center bg-muted/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 mx-auto mb-3">
            <Link2 className="h-7 w-7 text-teal-500/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Ainda não tens webhooks de entrada</p>
          <p className="text-xs text-muted-foreground mt-1">Clica em "Adicionar Webhook" para começar</p>
        </div>
      )}

      {/* Edit modal */}
      {editWh && <IntakeWebhookEditModal webhook={editWh} members={memberOptions} open={!!editWh} onOpenChange={(o) => { if (!o) setEditWh(null); }} />}

      {/* New dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Webhook de Entrada</DialogTitle>
            <DialogDescription>Recebe leads de fontes externas (Facebook, Google, Zapier…).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome</Label>
              <Input autoFocus placeholder="Ex: Facebook Ads — Campanha Verão" value={newName} onChange={(e) => setNewName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Atribuição de leads</Label>
              <AssignmentSelector
                members={memberOptions}
                mode={newMode}
                userIds={newUsers}
                noun="leads"
                onChange={({ mode, userIds }) => { setNewMode(mode); setNewUsers(userIds); }}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleAdd} disabled={!canCreate} className="flex-1">
                {createWebhook.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar webhook
              </Button>
              <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">📋 Como ligar ao Zapier / Make</p>
        <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Cria um cenário/zap com o trigger (Facebook Lead Ads, Google Forms, etc.)</li>
          <li>Adiciona uma ação HTTP <strong>POST</strong> com o URL do webhook (botão Copiar)</li>
          <li>Body type: <strong>JSON</strong> — mapeia <code className="bg-muted px-1 rounded text-xs">name</code>, <code className="bg-muted px-1 rounded text-xs">email</code>, <code className="bg-muted px-1 rounded text-xs">phone</code>, <code className="bg-muted px-1 rounded text-xs">company</code></li>
        </ol>
        <p className="text-xs text-amber-600 dark:text-amber-400">⚠️ Não partilhes estes URLs publicamente.</p>
      </div>
    </div>
  );
}

// IntakeWebhookCard mantido por compatibilidade mas já não é usado na UI
function IntakeWebhookCard({ webhook, members }: { webhook: LeadIntakeWebhook; members: MemberOption[] }) {
  return null;
}

// --- Form sub-components ---

type ChannelIcon = React.ComponentType<{ className?: string }>;
const CHANNEL_CATALOG: { type: string; label: string; icon: ChannelIcon; color: string; tint: string; available: boolean }[] = [
  { type: 'whatsapp', label: 'WhatsApp', icon: WhatsAppIcon, color: 'text-[#25D366]', tint: 'bg-[#25D366]/10', available: true },
  { type: 'email', label: 'Email', icon: Mail, color: 'text-blue-600', tint: 'bg-blue-500/10', available: true },
  { type: 'instagram', label: 'Instagram', icon: InstagramIcon, color: 'text-[#E4405F]', tint: 'bg-[#E4405F]/10', available: false },
  { type: 'facebook', label: 'Facebook', icon: MessengerIcon, color: 'text-[#0084FF]', tint: 'bg-[#0084FF]/10', available: false },
];

function channelMeta(type: string) {
  return CHANNEL_CATALOG.find((c) => c.type === type) || { type, label: type, icon: MessageCircle, color: 'text-muted-foreground', tint: 'bg-muted', available: true };
}

const CHANNEL_STATUS_LABEL: Record<string, string> = {
  connected: 'Ligada',
  connecting: 'A ligar...',
  disconnected: 'Desligada',
  error: 'Erro',
};

// Edit modal for a single caixa (replaces the old inline expand panel).
function EditCaixaModal({
  ch, members, open, onOpenChange,
  updateAssign, updateGroups, logoutChannel,
  onReconnect, onDisconnect,
}: {
  ch: ReturnType<typeof useMessagingChannels>['data'] extends (infer T)[] ? T : never;
  members: { id: string; full_name: string | null }[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  updateAssign: ReturnType<typeof useUpdateChannelAssignment>;
  updateGroups: ReturnType<typeof useUpdateChannelGroups>;
  logoutChannel: ReturnType<typeof useLogoutChannel>;
  onReconnect: () => void;
  onDisconnect: () => void;
}) {
  const meta = channelMeta(ch.channel_type);
  const Icon = meta.icon;
  const connected = ch.status === 'connected';
  const [labelDraft, setLabelDraft] = useState(ch.label || '');
  const [localColor, setLocalColor] = useState<string | null>(ch.color ?? null);
  const [localAttendants, setLocalAttendants] = useState<string[]>(ch.assigned_user_ids || []);
  const [localGroupsEnabled, setLocalGroupsEnabled] = useState<boolean>((ch.metadata as Record<string, unknown> | null)?.groups_enabled !== false);
  useEffect(() => {
    setLabelDraft(ch.label || '');
    setLocalColor(ch.color ?? null);
    setLocalAttendants(ch.assigned_user_ids || []);
    setLocalGroupsEnabled((ch.metadata as Record<string, unknown> | null)?.groups_enabled !== false);
  }, [ch.id, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        {/* Colored header */}
        <div className={cn('relative px-6 py-5 flex items-center gap-4', meta.tint)}>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm bg-white/80 dark:bg-black/30 shrink-0')}>
            <Icon className={cn('h-7 w-7', meta.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-base font-bold">{ch.label || meta.label}</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">
              {meta.label}{ch.phone_number ? ` · +${ch.phone_number}` : ''}
            </DialogDescription>
          </div>
          {connected ? (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-700 dark:text-green-400 bg-green-500/15 border border-green-500/30 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Ligada
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-full px-2.5 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Por ligar
            </span>
          )}
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Nome */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome da caixa</Label>
            <div className="flex gap-2">
              <Input
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                placeholder="Ex: Vendas, Suporte"
                className="h-9"
              />
              <Button
                size="sm"
                disabled={!labelDraft.trim() || labelDraft.trim() === (ch.label || '')}
                onClick={() => updateAssign.mutate({ channelId: ch.id, label: labelDraft.trim() })}
              >
                Guardar
              </Button>
            </div>
          </div>

          {/* Cor da caixa */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cor da caixa</Label>
            <div className="flex flex-wrap items-center gap-2">
              {['#ef4444','#f97316','#f59e0b','#22c55e','#14b8a6','#3b82f6','#6366f1','#a855f7','#ec4899','#64748b'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { const next = localColor === c ? null : c; setLocalColor(next); updateAssign.mutate({ channelId: ch.id, color: next }); }}
                  className={cn(
                    'h-6 w-6 rounded-full transition-transform hover:scale-110 ring-offset-background ring-offset-2',
                    localColor === c ? 'ring-2 ring-foreground scale-110' : '',
                  )}
                  style={{ background: c }}
                  title={ch.color === c ? 'Remover cor' : c}
                />
              ))}
            </div>
          </div>

          {/* Ligação */}
          {ch.channel_type === 'whatsapp' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ligação</Label>
              {connected ? (
                <Button variant="outline" size="sm" onClick={onDisconnect} disabled={logoutChannel.isPending}
                  className="w-full text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5">
                  <PowerOff className="h-4 w-4 mr-1.5" /> Desconectar WhatsApp
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={onReconnect} className="w-full">
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  {ch.evolution_instance ? 'Reconectar WhatsApp' : 'Ligar WhatsApp'}
                </Button>
              )}
            </div>
          )}

          {/* Quem atende */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <UsersRound className="h-3.5 w-3.5" /> Quem atende esta caixa
            </Label>
            <p className="text-[11px] text-muted-foreground">
              Vazio = todos veem esta caixa no Inbox. Com pessoas selecionadas, só elas (e os administradores) a veem.
            </p>
            <CollaboratorPicker
              members={members.map((m) => ({ user_id: m.user_id ?? m.id, full_name: m.full_name || m.user_id || m.id }))}
              value={localAttendants}
              onChange={(next) => { setLocalAttendants(next); updateAssign.mutate({ channelId: ch.id, assigned_user_ids: next }); }}
              mode="multi"
              emptyHint="Vazio = todos os colaboradores veem esta caixa."
            />
          </div>

          {/* Toggles */}
          <div className="rounded-xl border divide-y overflow-hidden">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                  <RefreshCw className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Rotação automática</p>
                  <p className="text-[11px] text-muted-foreground">Distribui contactos novos pelos colaboradores</p>
                </div>
              </div>
              <Switch
                checked={ch.rotate_enabled}
                onCheckedChange={(v) => updateAssign.mutate({ channelId: ch.id, rotate_enabled: v })}
              />
            </div>
            {ch.channel_type === 'whatsapp' && (
              <div className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                    <UsersRound className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Mensagens de grupo</p>
                    <p className="text-[11px] text-muted-foreground">Grupos WhatsApp aparecem na Caixa de Entrada</p>
                  </div>
                </div>
                <Switch
                  checked={localGroupsEnabled}
                  disabled={updateGroups.isPending}
                  onCheckedChange={(v) => { setLocalGroupsEnabled(v); updateGroups.mutate({ channelId: ch.id, groupsEnabled: v }); }}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Caixas de Entrada: lists the org's connected channels and lets the admin add a
// new one. Phase 1 supports WhatsApp (Evolution + Chatwoot); other channels are
// surfaced as "em breve" until their providers are wired.
function InboxesManager() {
  useAutoRepairWiring(); // silent one-time repair of broken Evolution→Chatwoot wiring
  const { data: channels = [] } = useMessagingChannels();
  const { data: members = [] } = useTeamMembers();
  const { limits, planName } = useSubscription();
  const { organization } = useAuth();
  const { toast } = useToast();
  const deleteChannel = useDeleteChannel();
  const deleteEmailChannel = useDeleteEmailChannel();
  const cleanupOrphans = useCleanupOrphanChannels();
  const updateAssign = useUpdateChannelAssignment();
  const updateGroups = useUpdateChannelGroups();
  const logoutChannel = useLogoutChannel();

  const [editCh, setEditCh] = useState<typeof channels[0] | null>(null);
  const [editEmailCh, setEditEmailCh] = useState<EmailChannel | null>(null);
  const [toDisconnect, setToDisconnect] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<{ id: string; type: string } | null>(null);
  // WhatsApp connect modal
  const [connectModal, setConnectModal] = useState<{ open: boolean; channelId?: string; label?: string }>({ open: false });
  // New caixa dialog
  const [newOpen, setNewOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [addEmailOpen, setAddEmailOpen] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Deep link from the empty inbox (?addInbox=1): open the "Nova caixa" chooser
  // straight away, then drop the param so a refresh doesn't reopen it.
  useEffect(() => {
    if (searchParams.get('addInbox')) {
      setNewOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('addInbox');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orphanCount = channels.filter((c) => c.channel_type !== 'email' && c.status !== 'connected').length;

  // Caixa (inbox) limit: per-org override wins; null = unlimited. Every caixa is a
  // messaging_channels row (WhatsApp, Email, ...), so channels.length is the count.
  const overrideInboxes = (organization as { max_inboxes_override?: number | null } | null)?.max_inboxes_override;
  const maxInboxes = overrideInboxes ?? limits.maxInboxes;
  const inboxCount = channels.length;
  const atInboxLimit = maxInboxes != null && inboxCount >= maxInboxes;

  // Returns true (and warns) when the org has hit its caixa limit — callers bail.
  const blockIfAtLimit = () => {
    if (!atInboxLimit) return false;
    toast({
      title: `Limite de ${maxInboxes} caixas atingido`,
      description: `O plano ${planName} permite ${maxInboxes} caixas de entrada. Faz upgrade para adicionares mais canais.`,
      variant: 'destructive',
    });
    return true;
  };

  const startNewWhatsApp = () => {
    if (blockIfAtLimit()) return;
    setConnectModal({ open: true, label: newLabel.trim() || 'WhatsApp' });
    setNewOpen(false);
    setNewLabel('');
  };

  return (
    <div className="space-y-4">
      {/* Header with "Nova caixa" always visible at top */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            Liga as tuas contas para receber e responder mensagens de todos os canais num só lugar.
          </p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">
            <span className={cn(atInboxLimit && 'text-destructive')}>{inboxCount}</span>
            {maxInboxes != null ? ` / ${maxInboxes}` : ''} caixa{inboxCount !== 1 ? 's' : ''}
            {maxInboxes != null && ` · plano ${planName}`}
          </p>
        </div>
        <Button
          onClick={() => { if (blockIfAtLimit()) return; setNewOpen(true); }}
          size="sm"
          className="shrink-0 gap-1.5"
        >
          <Plus className="h-4 w-4" /> Nova caixa
        </Button>
      </div>

      {/* Filter pills */}
      {channels.length > 0 && (() => {
        const types = Array.from(new Set(channels.map((c) => c.channel_type)));
        if (types.length <= 1) return null;
        return (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType(null)}
              className={"${filterType === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'} rounded-full px-3 py-1 text-xs font-semibold transition-colors"}
            >
              Todas
            </button>
            {types.map((t) => {
              const meta = channelMeta(t);
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(filterType === t ? null : t)}
                  className={"${filterType === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'} rounded-full px-3 py-1 text-xs font-semibold transition-colors"}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        );
      })()}

      {/* 3-column grid */}
      {channels.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {channels.filter((ch) => filterType === null || ch.channel_type === filterType).map((ch) => {
            const meta = channelMeta(ch.channel_type);
            const Icon = meta.icon;
            const isEmail = ch.channel_type === 'email';
            const connected = isEmail || ch.status === 'connected';
            const attendants = ch.assigned_user_ids || [];
            const groupsOn = !isEmail && (ch.metadata as Record<string, unknown> | null)?.groups_enabled !== false;
            const emailAddr = isEmail ? (ch.metadata as Record<string, unknown> | null)?.email_address as string | undefined : undefined;
            return (
              <div key={ch.id} className={cn(
                'rounded-2xl border overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col',
                !connected && 'border-dashed opacity-80',
              )}>
                {/* Colored top strip */}
                <div className={cn('px-4 pt-4 pb-3 flex items-start gap-3', meta.tint)}>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 dark:bg-black/30 shrink-0 shadow-sm">
                    <Icon className={cn('h-6 w-6', meta.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{ch.label || meta.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {emailAddr ?? (ch.phone_number ? `+${ch.phone_number}` : meta.label)}
                    </p>
                  </div>
                  {connected ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 dark:text-green-400 bg-green-500/20 border border-green-500/30 rounded-full px-2 py-0.5 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Ligada
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30 rounded-full px-2 py-0.5 shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {CHANNEL_STATUS_LABEL[ch.status] || 'Por ligar'}
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex items-center gap-3 px-4 py-2.5 border-t border-b text-xs text-muted-foreground bg-muted/10">
                  <span className="flex items-center gap-1">
                    <UsersRound className="h-3.5 w-3.5" />
                    {attendants.length > 0 ? `${attendants.length} atendente${attendants.length !== 1 ? 's' : ''}` : 'Todos'}
                  </span>
                  {ch.rotate_enabled && (
                    <span className="flex items-center gap-1 text-blue-600">
                      <RefreshCw className="h-3 w-3" /> Rotação
                    </span>
                  )}
                  {groupsOn && (
                    <span className="flex items-center gap-1 text-green-600">
                      <UsersRound className="h-3 w-3" /> Grupos
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 px-4 py-3 mt-auto">
                  <Button size="sm" variant="outline" className="flex-1 gap-1.5 h-8" onClick={() => {
                    if (isEmail) setEditEmailCh(ch as unknown as EmailChannel);
                    else setEditCh(ch);
                  }}>
                    <Settings2 className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <button
                    type="button"
                    onClick={() => setToDelete({ id: ch.id, type: ch.channel_type })}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                    title="Remover caixa"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-10 text-center bg-muted/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mx-auto mb-3">
            <Inbox className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Ainda não tens nenhuma caixa ligada</p>
          <p className="text-xs text-muted-foreground mt-1">Clica em "Nova caixa" para começar</p>
        </div>
      )}

      {orphanCount > 0 && (
        <Button variant="ghost" size="sm" onClick={() => cleanupOrphans.mutate()} disabled={cleanupOrphans.isPending}
          className="w-full text-muted-foreground hover:text-destructive">
          {cleanupOrphans.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          Limpar {orphanCount} {orphanCount === 1 ? 'caixa por ligar' : 'caixas por ligar'}
        </Button>
      )}

      {/* Edit modal — social channels */}
      {editCh && (
        <EditCaixaModal
          ch={editCh}
          members={members}
          open={!!editCh}
          onOpenChange={(o) => { if (!o) setEditCh(null); }}
          updateAssign={updateAssign}
          updateGroups={updateGroups}
          logoutChannel={logoutChannel}
          onReconnect={() => { setConnectModal({ open: true, channelId: editCh.id }); setEditCh(null); }}
          onDisconnect={() => { setToDisconnect(editCh.id); setEditCh(null); }}
        />
      )}
      {/* Edit modal — email channels */}
      {editEmailCh && (
        <EditEmailModal
          channel={editEmailCh}
          open={!!editEmailCh}
          onOpenChange={(o) => { if (!o) setEditEmailCh(null); }}
          members={members}
        />
      )}
      {/* Add email modal */}
      <AddEmailModal open={addEmailOpen} onOpenChange={setAddEmailOpen} />

      {/* New caixa dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova caixa de entrada</DialogTitle>
            <DialogDescription>Escolhe o canal e dá-lhe um nome.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {CHANNEL_CATALOG.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.type}
                  type="button"
                  disabled={!c.available}
                  onClick={() => {
                    if (!c.available) return;
                    if (blockIfAtLimit()) { setNewOpen(false); return; }
                    if (c.type === 'email') { setAddEmailOpen(true); setNewOpen(false); return; }
                    // WhatsApp (and future channels): stay open so user enters a label
                  }}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all',
                    c.available ? 'hover:border-primary/40 hover:bg-accent/50 cursor-pointer' : 'opacity-50 cursor-not-allowed',
                  )}
                >
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg shrink-0', c.tint)}>
                    <Icon className={cn('h-5 w-5', c.color)} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    {!c.available && <p className="text-[10px] text-muted-foreground">Em breve</p>}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="space-y-2 border-t pt-4">
            <Label htmlFor="new-inbox-label" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome da caixa</Label>
            <Input
              id="new-inbox-label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex: Vendas, Suporte"
              onKeyDown={(e) => e.key === 'Enter' && startNewWhatsApp()}
            />
            <Button onClick={startNewWhatsApp} className="w-full gap-2">
              <MessageCircle className="h-4 w-4" /> Ligar WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* WhatsApp QR modal */}
      <ConnectWhatsAppModal
        open={connectModal.open}
        onOpenChange={(o) => setConnectModal((m) => ({ ...m, open: o }))}
        channelId={connectModal.channelId}
        label={connectModal.label}
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
              onClick={() => {
                if (!toDelete) return;
                if (toDelete.type === 'email') deleteEmailChannel.mutate(toDelete.id);
                else deleteChannel.mutate(toDelete.id);
                setToDelete(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!toDisconnect} onOpenChange={(o) => !o && setToDisconnect(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desconectar este WhatsApp?</AlertDialogTitle>
            <AlertDialogDescription>
              A sessão de WhatsApp termina e deixas de receber/enviar mensagens por esta caixa. A caixa mantém-se: podes voltar a ligar quando quiseres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (toDisconnect) logoutChannel.mutate(toDisconnect); setToDisconnect(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desconectar
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
