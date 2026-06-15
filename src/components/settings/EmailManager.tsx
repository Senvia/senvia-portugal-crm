import { useState, useEffect } from 'react';
import { Mail, Settings2, Trash2, Plus, Loader2, Eye, EyeOff, Server, Lock, AlertCircle, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  useEmailChannels, useCreateEmailChannel, useUpdateEmailChannel, useDeleteEmailChannel,
  type EmailChannel, type EmailChannelInput,
} from '@/hooks/useEmailChannels';
import { useUpdateChannelAssignment } from '@/hooks/useMessagingChannels';
import { CollaboratorPicker } from './CollaboratorPicker';

// ─── Provider presets ──────────────────────────────────────────────────────────

type ProviderKey = 'gmail' | 'outlook' | 'zoho' | 'custom';

interface ProviderPreset {
  label: string;
  imap_server: string;
  imap_port: number;
  imap_ssl: boolean;
  smtp_server: string;
  smtp_port: number;
  smtp_ssl: boolean;
  note?: string;
}

const PROVIDERS: Record<ProviderKey, ProviderPreset> = {
  gmail: {
    label: 'Gmail',
    imap_server: 'imap.gmail.com', imap_port: 993, imap_ssl: true,
    smtp_server: 'smtp.gmail.com', smtp_port: 587, smtp_ssl: false,
    note: 'O Gmail exige uma Palavra-passe de App (não a sua password normal). Ative em: Conta Google → Segurança → Verificação em 2 passos → Palavras-passe de app.',
  },
  outlook: {
    label: 'Outlook / Office 365',
    imap_server: 'outlook.office365.com', imap_port: 993, imap_ssl: true,
    smtp_server: 'smtp.office365.com', smtp_port: 587, smtp_ssl: false,
    note: 'Se tiver MFA ativo, gere uma Palavra-passe de App em: Microsoft Account → Segurança → Palavras-passe de app.',
  },
  zoho: {
    label: 'Zoho Mail',
    imap_server: 'imappro.zoho.eu', imap_port: 993, imap_ssl: true,
    smtp_server: 'smtppro.zoho.eu', smtp_port: 465, smtp_ssl: true,
  },
  custom: {
    label: 'Servidor personalizado',
    imap_server: '', imap_port: 993, imap_ssl: true,
    smtp_server: '', smtp_port: 587, smtp_ssl: false,
  },
};

// ─── Form state ────────────────────────────────────────────────────────────────

interface EmailFormState {
  label: string;
  provider_key: ProviderKey;
  email_address: string;
  imap_server: string;
  imap_port: string;
  imap_ssl: boolean;
  imap_login: string;
  imap_password: string;
  smtp_server: string;
  smtp_port: string;
  smtp_ssl: boolean;
  smtp_login: string;
  smtp_password: string;
  same_creds: boolean; // mirror IMAP creds to SMTP
}

function emptyForm(): EmailFormState {
  return {
    label: '', provider_key: 'gmail', email_address: '',
    imap_server: 'imap.gmail.com', imap_port: '993', imap_ssl: true,
    imap_login: '', imap_password: '',
    smtp_server: 'smtp.gmail.com', smtp_port: '587', smtp_ssl: false,
    smtp_login: '', smtp_password: '',
    same_creds: true,
  };
}

function applyProvider(form: EmailFormState, key: ProviderKey): EmailFormState {
  const p = PROVIDERS[key];
  const newForm: EmailFormState = {
    ...form,
    provider_key: key,
    imap_server: p.imap_server,
    imap_port: String(p.imap_port),
    imap_ssl: p.imap_ssl,
    smtp_server: p.smtp_server,
    smtp_port: String(p.smtp_port),
    smtp_ssl: p.smtp_ssl,
  };
  if (newForm.same_creds) {
    newForm.smtp_login = newForm.imap_login;
    newForm.smtp_password = newForm.imap_password;
  }
  return newForm;
}

function formFromChannel(ch: EmailChannel): EmailFormState {
  const m = ch.metadata ?? {};
  return {
    label: ch.label ?? '',
    provider_key: (m.provider_key as ProviderKey) ?? 'custom',
    email_address: m.email_address ?? '',
    imap_server: m.imap_server ?? '',
    imap_port: String(m.imap_port ?? 993),
    imap_ssl: m.imap_ssl !== false,
    imap_login: m.imap_login ?? '',
    imap_password: '', // never pre-fill password
    smtp_server: m.smtp_server ?? '',
    smtp_port: String(m.smtp_port ?? 587),
    smtp_ssl: m.smtp_ssl === true,
    smtp_login: m.smtp_login ?? '',
    smtp_password: '', // never pre-fill password
    same_creds: (m.imap_login ?? '') === (m.smtp_login ?? ''),
  };
}

// ─── PasswordInput ─────────────────────────────────────────────────────────────

function PasswordInput({ value, onChange, placeholder, id }: {
  value: string; onChange: (v: string) => void; placeholder?: string; id?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pr-10"
        autoComplete="new-password"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─── Email Form ────────────────────────────────────────────────────────────────

function EmailForm({
  form, setForm, isEdit = false, error,
}: {
  form: EmailFormState;
  setForm: (f: EmailFormState) => void;
  isEdit?: boolean;
  error?: string | null;
}) {
  const update = (patch: Partial<EmailFormState>) => {
    const next = { ...form, ...patch };
    // Keep SMTP in sync when same_creds is on
    if (next.same_creds) {
      next.smtp_login = next.imap_login;
      next.smtp_password = next.imap_password;
    }
    setForm(next);
  };

  const provider = PROVIDERS[form.provider_key];

  return (
    <div className="space-y-5">
      {/* Provider pills */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fornecedor</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PROVIDERS) as ProviderKey[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setForm(applyProvider(form, k))}
              className={cn(
                'px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors',
                form.provider_key === k
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-border bg-card hover:bg-accent/50 text-foreground',
              )}
            >
              {PROVIDERS[k].label}
            </button>
          ))}
        </div>
        {provider.note && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 mt-1">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">{provider.note}</p>
          </div>
        )}
      </div>

      {/* Name + Email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="em-label" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Nome da caixa
          </Label>
          <Input id="em-label" placeholder="Ex: Suporte, Vendas" value={form.label} onChange={(e) => update({ label: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="em-email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Endereço de email
          </Label>
          <Input id="em-email" type="email" placeholder="suporte@empresa.com" value={form.email_address} onChange={(e) => update({ email_address: e.target.value, imap_login: e.target.value, smtp_login: form.same_creds ? e.target.value : form.smtp_login })} />
        </div>
      </div>

      {/* IMAP */}
      <div className="rounded-xl border overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b">
          <Server className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold">IMAP — Receção de email</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-[1fr_100px_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Servidor</Label>
            <Input placeholder="imap.gmail.com" value={form.imap_server} onChange={(e) => update({ imap_server: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Porta</Label>
            <Input type="number" value={form.imap_port} onChange={(e) => update({ imap_port: e.target.value })} />
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <Switch checked={form.imap_ssl} onCheckedChange={(v) => update({ imap_ssl: v })} />
            <Label className="text-xs">SSL</Label>
          </div>
        </div>
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Utilizador IMAP</Label>
            <Input placeholder={form.email_address || 'utilizador@email.com'} value={form.imap_login} onChange={(e) => update({ imap_login: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Password IMAP</Label>
            <PasswordInput
              value={form.imap_password}
              onChange={(v) => update({ imap_password: v })}
              placeholder={isEdit ? '(manter a atual)' : 'App Password ou password de email'}
            />
          </div>
        </div>
      </div>

      {/* Same credentials toggle */}
      <div className="flex items-center gap-3 px-1">
        <Switch
          checked={form.same_creds}
          onCheckedChange={(v) => update({ same_creds: v, smtp_login: v ? form.imap_login : form.smtp_login, smtp_password: v ? form.imap_password : form.smtp_password })}
        />
        <Label className="text-sm font-medium cursor-pointer">Usar as mesmas credenciais para SMTP</Label>
      </div>

      {/* SMTP */}
      <div className={cn('rounded-xl border overflow-hidden transition-opacity', form.same_creds && 'opacity-60')}>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/30 border-b">
          <Server className="h-4 w-4 text-green-600" />
          <span className="text-sm font-semibold">SMTP — Envio de email</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-[1fr_100px_auto] gap-3 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Servidor</Label>
            <Input
              placeholder="smtp.gmail.com" value={form.smtp_server}
              onChange={(e) => update({ smtp_server: e.target.value })}
              disabled={form.same_creds}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Porta</Label>
            <Input type="number" value={form.smtp_port} onChange={(e) => update({ smtp_port: e.target.value })} disabled={form.same_creds} />
          </div>
          <div className="flex items-center gap-2 pb-0.5">
            <Switch checked={form.smtp_ssl} onCheckedChange={(v) => update({ smtp_ssl: v })} disabled={form.same_creds} />
            <Label className="text-xs">SSL</Label>
          </div>
        </div>
        <div className="px-4 pb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Utilizador SMTP</Label>
            <Input
              placeholder={form.email_address || 'utilizador@email.com'}
              value={form.smtp_login}
              onChange={(e) => update({ smtp_login: e.target.value })}
              disabled={form.same_creds}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1"><Lock className="h-3 w-3" /> Password SMTP</Label>
            <PasswordInput
              value={form.smtp_password}
              onChange={(v) => update({ smtp_password: v })}
              placeholder={isEdit ? '(manter a atual)' : 'App Password ou password de email'}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}

// ─── Add Modal ─────────────────────────────────────────────────────────────────

export function AddEmailModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const createChannel = useCreateEmailChannel();
  const [form, setForm] = useState<EmailFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => { if (open) { setForm(emptyForm()); setFormError(null); } }, [open]);

  const canSubmit = !!form.label.trim() && !!form.email_address.includes('@') &&
    !!form.imap_server && !!form.imap_password && !!form.smtp_server && !!form.smtp_password &&
    !createChannel.isPending;

  const handleCreate = async () => {
    setFormError(null);
    const input: EmailChannelInput = {
      label: form.label.trim(),
      email_config: {
        email_address: form.email_address.trim(),
        imap_server: form.imap_server.trim(),
        imap_port: Number(form.imap_port) || 993,
        imap_ssl: form.imap_ssl,
        imap_login: (form.imap_login || form.email_address).trim(),
        imap_password: form.imap_password,
        smtp_server: form.same_creds ? form.imap_server.trim() : form.smtp_server.trim(),
        smtp_port: form.same_creds ? Number(form.imap_port) || 993 : Number(form.smtp_port) || 587,
        smtp_ssl: form.same_creds ? form.imap_ssl : form.smtp_ssl,
        smtp_login: (form.same_creds ? form.imap_login || form.email_address : form.smtp_login || form.email_address).trim(),
        smtp_password: form.same_creds ? form.imap_password : form.smtp_password,
        provider_key: form.provider_key,
      },
    };
    createChannel.mutate(input, {
      onSuccess: () => onOpenChange(false),
      onError: (e) => setFormError(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <div className="px-6 py-5 flex items-center gap-4 bg-blue-500/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 dark:bg-black/30 shadow-sm shrink-0">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold">Adicionar Caixa de Email</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">Configurar IMAP/SMTP para receber e enviar emails no CRM</DialogDescription>
          </div>
        </div>
        <div className="px-6 py-5 overflow-y-auto max-h-[70vh]">
          <EmailForm form={form} setForm={setForm} error={formError} />
        </div>
        <div className="flex gap-2 px-6 py-4 border-t">
          <Button onClick={handleCreate} disabled={!canSubmit} className="flex-1">
            {createChannel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar caixa de email
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Edit Modal ────────────────────────────────────────────────────────────────

export function EditEmailModal({
  channel, open, onOpenChange, members = [],
}: {
  channel: EmailChannel;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  members?: { id: string; full_name: string | null }[];
}) {
  const updateChannel = useUpdateEmailChannel();
  const updateAssign = useUpdateChannelAssignment();
  const [form, setForm] = useState<EmailFormState>(formFromChannel(channel));
  const [formError, setFormError] = useState<string | null>(null);
  const attendants: string[] = (channel as unknown as { assigned_user_ids?: string[] }).assigned_user_ids ?? [];

  useEffect(() => { if (open) { setForm(formFromChannel(channel)); setFormError(null); } }, [channel, open]);

  const handleSave = () => {
    setFormError(null);
    updateChannel.mutate({
      channel_id: channel.id,
      label: form.label.trim() || undefined,
      email_config: {
        email_address: form.email_address.trim(),
        imap_server: form.imap_server.trim(),
        imap_port: Number(form.imap_port) || 993,
        imap_ssl: form.imap_ssl,
        imap_login: (form.imap_login || form.email_address).trim(),
        imap_password: form.imap_password || undefined, // blank = keep existing
        smtp_server: form.same_creds ? form.imap_server.trim() : form.smtp_server.trim(),
        smtp_port: form.same_creds ? Number(form.imap_port) || 993 : Number(form.smtp_port) || 587,
        smtp_ssl: form.same_creds ? form.imap_ssl : form.smtp_ssl,
        smtp_login: (form.same_creds ? form.imap_login || form.email_address : form.smtp_login || form.email_address).trim(),
        smtp_password: (form.same_creds ? form.imap_password : form.smtp_password) || undefined,
        provider_key: form.provider_key,
      },
    }, {
      onSuccess: () => onOpenChange(false),
      onError: (e) => setFormError(e.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden">
        <div className="px-6 py-5 flex items-center gap-4 bg-blue-500/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 dark:bg-black/30 shadow-sm shrink-0">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold">{channel.label ?? 'Caixa de Email'}</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">{channel.metadata?.email_address ?? ''}</DialogDescription>
          </div>
        </div>
        <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[70vh]">
          {/* Quem atende */}
          {members.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                <UsersRound className="h-3.5 w-3.5" /> Quem atende esta caixa
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Vazio = todos veem esta caixa no Inbox. Com pessoas selecionadas, só elas (e os administradores) a veem.
              </p>
              <CollaboratorPicker
                members={members.map((m) => ({ user_id: m.id, full_name: m.full_name || m.id }))}
                value={attendants}
                onChange={(next) => updateAssign.mutate({ channelId: channel.id, assigned_user_ids: next })}
                mode="multi"
                emptyHint="Vazio = todos os colaboradores veem esta caixa."
              />
            </div>
          )}

          {/* Cor da caixa */}
          {(() => {
            const chColor = (channel as unknown as { color?: string | null }).color ?? null;
            return (
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cor da caixa</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {['#ef4444','#f97316','#f59e0b','#22c55e','#14b8a6','#3b82f6','#6366f1','#a855f7','#ec4899','#64748b'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateAssign.mutate({ channelId: channel.id, color: chColor === c ? null : c })}
                      className={cn(
                        'h-6 w-6 rounded-full transition-transform hover:scale-110 ring-offset-background ring-offset-2',
                        chColor === c ? 'ring-2 ring-foreground scale-110' : '',
                      )}
                      style={{ background: c }}
                      title={chColor === c ? 'Remover cor' : c}
                    />
                  ))}
                </div>
              </div>
            );
          })()}

          <EmailForm form={form} setForm={setForm} isEdit error={formError} />
        </div>
        <div className="flex gap-2 px-6 py-4 border-t">
          <Button onClick={handleSave} disabled={updateChannel.isPending} className="flex-1">
            {updateChannel.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar alterações
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Provider badge ────────────────────────────────────────────────────────────

function ProviderBadge({ providerKey }: { providerKey?: string }) {
  const labels: Record<string, string> = {
    gmail: 'Gmail', outlook: 'Outlook', zoho: 'Zoho', custom: 'IMAP/SMTP',
  };
  return (
    <span className="text-[10px] font-semibold border rounded-full px-2 py-0.5 bg-blue-500/10 text-blue-700 border-blue-500/20 shrink-0">
      {labels[providerKey ?? 'custom'] ?? 'IMAP/SMTP'}
    </span>
  );
}

// ─── EmailManager ──────────────────────────────────────────────────────────────

export function EmailManager() {
  const { data: channels = [], isLoading } = useEmailChannels();
  const deleteChannel = useDeleteEmailChannel();
  const [addOpen, setAddOpen] = useState(false);
  const [editCh, setEditCh] = useState<EmailChannel | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">A carregar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Ligue caixas de email (Gmail, Outlook, Exchange, IMAP) para receber e responder emails diretamente no CRM.
          Cada caixa é uma conta de email separada.
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" /> Adicionar Email
        </Button>
      </div>

      {channels.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {channels.map((ch) => (
            <div key={ch.id} className="rounded-2xl border overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="px-4 pt-4 pb-3 flex items-start gap-3 bg-blue-500/10">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 dark:bg-black/30 shadow-sm shrink-0">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{ch.label ?? 'Email'}</p>
                  <p className="text-xs text-muted-foreground truncate">{ch.metadata?.email_address ?? '—'}</p>
                </div>
                <ProviderBadge providerKey={ch.metadata?.provider_key} />
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 border-t border-b text-xs text-muted-foreground bg-muted/10">
                <span className="font-mono text-[11px]">
                  IMAP {ch.metadata?.imap_server ?? ''}:{ch.metadata?.imap_port ?? 993}
                </span>
                <span className="font-mono text-[11px] ml-auto">
                  SMTP {ch.metadata?.smtp_server ?? ''}:{ch.metadata?.smtp_port ?? 587}
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-3 mt-auto">
                <Button
                  size="sm" variant="outline" className="flex-1 gap-1.5 h-8"
                  onClick={() => setEditCh(ch)}
                >
                  <Settings2 className="h-3.5 w-3.5" /> Editar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 px-2.5 text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Eliminar "{ch.label}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        A caixa será removida do Chatwoot e do CRM. Os emails já recebidos ficam no histórico do Chatwoot.
                        Esta ação não pode ser anulada.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteChannel.mutate(ch.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteChannel.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Eliminar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-10 text-center bg-muted/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 mx-auto mb-3">
            <Mail className="h-7 w-7 text-blue-500/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Nenhuma caixa de email configurada</p>
          <p className="text-xs text-muted-foreground mt-1">Clica em "Adicionar Email" para ligar a tua primeira caixa</p>
        </div>
      )}

      <div className="rounded-xl border bg-muted/20 p-4 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">📋 Compatibilidade</p>
        <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
          <li><strong>Gmail</strong> — requer Palavra-passe de App (não a password normal)</li>
          <li><strong>Outlook / Office 365</strong> — requer IMAP ativado nas definições do Microsoft 365</li>
          <li><strong>Exchange (local)</strong> — requer IMAP/SMTP ativado pelo administrador do servidor</li>
          <li><strong>Zoho, Mailgun, Postmark, etc.</strong> — qualquer servidor IMAP/SMTP padrão</li>
        </ul>
        <p className="text-xs text-amber-600 dark:text-amber-400">
          ⚠️ As credenciais são guardadas de forma segura e utilizadas pelo Chatwoot para fazer polling IMAP. Cada conta criada aqui equivale a uma caixa independente no Chatwoot.
        </p>
      </div>

      <AddEmailModal open={addOpen} onOpenChange={setAddOpen} />
      {editCh && (
        <EditEmailModal
          channel={editCh}
          open={!!editCh}
          onOpenChange={(o) => { if (!o) setEditCh(null); }}
        />
      )}
    </div>
  );
}
