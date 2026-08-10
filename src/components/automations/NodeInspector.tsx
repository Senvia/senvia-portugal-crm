import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  CONDITION_FIELD_OPTIONS, CONDITION_OPERATOR_OPTIONS, SALE_STATUS_OPTIONS,
  VALUELESS_OPERATORS, WAIT_UNIT_OPTIONS, getNodeDefinition, getNodeStyle,
} from '@/lib/automation-nodes';
import { createId } from '@/lib/automation-graph';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { useContactLists } from '@/hooks/useContactLists';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useTeamMembers } from '@/hooks/useTeam';
import type {
  AutomationGraphNode, AutomationNodeConfig, AutomationWaitUnit, WaitReplyRule,
} from '@/types/automations';

interface NodeInspectorProps {
  node: AutomationGraphNode;
  isEntry: boolean;
  onChange: (config: AutomationNodeConfig) => void;
  onDelete: () => void;
  onClose: () => void;
}

/** Right-hand configuration panel for the selected node. */
export function NodeInspector({ node, isEntry, onChange, onDelete, onClose }: NodeInspectorProps) {
  const definition = getNodeDefinition(node.type);
  const style = getNodeStyle(node.type);
  const Icon = definition?.icon;
  const config = node.config ?? {};

  const set = (patch: Partial<AutomationNodeConfig>) => onChange({ ...config, ...patch });

  return (
    <aside
      className={cn(
        'absolute inset-y-0 right-0 z-10 flex w-full flex-col border-l border-border bg-card',
        'shadow-lg sm:w-[360px]',
      )}
    >
      <div className="flex items-start gap-3 border-b border-border p-4">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-[2.5px]',
            style.bg,
            style.ring,
          )}
        >
          {Icon && <Icon className={cn('h-5 w-5', style.icon)} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{definition?.label ?? node.type}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{definition?.description}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          <NodeConfigForm node={node} config={config} set={set} />
        </div>
      </ScrollArea>

      {!isEntry && (
        <div className="border-t border-border p-4">
          <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar passo
          </Button>
        </div>
      )}
    </aside>
  );
}

// ── Config forms ────────────────────────────────────────────────────────────

interface FormProps {
  node: AutomationGraphNode;
  config: AutomationNodeConfig;
  set: (patch: Partial<AutomationNodeConfig>) => void;
}

function NodeConfigForm({ node, config, set }: FormProps) {
  const { data: stages } = usePipelineStages();
  const { data: lists } = useContactLists();
  const { data: templates } = useEmailTemplates();
  const { data: members } = useTeamMembers();

  switch (node.type) {
    // ── Triggers ──
    case 'lead_created':
      return (
        <>
          <Hint>Este fluxo arranca sempre que uma nova lead é criada na organização.</Hint>
          <Field label="Origem (opcional)">
            <Input
              value={(config.source as string) ?? ''}
              onChange={(e) => set({ source: e.target.value })}
              placeholder="Ex.: Facebook Ads"
            />
            <Helper>Deixe vazio para arrancar com leads de qualquer origem.</Helper>
          </Field>
        </>
      );

    case 'lead_status_changed':
      return (
        <>
          <Field label="De (opcional)">
            <StageSelect
              value={(config.from_stage_id as string) ?? ''}
              stages={stages}
              placeholder="Qualquer etapa"
              onChange={(value) => set({ from_stage_id: value })}
            />
          </Field>
          <Field label="Para">
            <StageSelect
              value={(config.to_stage_id as string) ?? ''}
              stages={stages}
              placeholder="Qualquer etapa"
              onChange={(value) => set({ to_stage_id: value })}
            />
          </Field>
        </>
      );

    case 'form_submitted':
      return (
        <Field label="Slug do formulário">
          <Input
            value={config.form_slug ?? ''}
            onChange={(e) => set({ form_slug: e.target.value })}
            placeholder="Ex.: pedido-orcamento"
          />
          <Helper>Deixe vazio para reagir a qualquer formulário público.</Helper>
        </Field>
      );

    case 'whatsapp_keyword':
      return (
        <Field label="Palavras-chave">
          <KeywordsInput
            value={config.keywords ?? []}
            onChange={(keywords) => set({ keywords })}
          />
          <Helper>Separe por vírgulas. A mensagem recebida só precisa de conter uma delas.</Helper>
        </Field>
      );

    case 'sale_status_changed':
      return (
        <Field label="Novo estado da venda">
          <Select value={config.to_status ?? ''} onValueChange={(value) => set({ to_status: value })}>
            <SelectTrigger><SelectValue placeholder="Escolher estado" /></SelectTrigger>
            <SelectContent>
              {SALE_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );

    case 'list_joined':
      return (
        <Field label="Lista">
          <Select value={config.list_id ?? ''} onValueChange={(value) => set({ list_id: value })}>
            <SelectTrigger><SelectValue placeholder="Escolher lista" /></SelectTrigger>
            <SelectContent>
              {(lists ?? []).map((list) => (
                <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );

    // ── Actions ──
    case 'send_whatsapp':
      return (
        <>
          <Field label="Mensagem">
            <Textarea
              value={config.message ?? ''}
              onChange={(e) => set({ message: e.target.value })}
              placeholder="Olá {{nome}}, obrigado pelo seu contacto!"
              rows={6}
            />
            <Helper>Use variáveis como {'{{nome}}'}, {'{{email}}'} ou {'{{telefone}}'}.</Helper>
          </Field>
          <Field label="Media (opcional)">
            <Input
              value={config.media_url ?? ''}
              onChange={(e) => set({ media_url: e.target.value })}
              placeholder="https://…"
            />
            <Helper>URL de imagem, PDF ou vídeo a anexar à mensagem.</Helper>
          </Field>
        </>
      );

    case 'send_email':
      return (
        <>
          <Field label="Template">
            <Select
              value={config.template_id ?? '__custom__'}
              onValueChange={(value) =>
                set(value === '__custom__' ? { template_id: undefined } : { template_id: value })
              }
            >
              <SelectTrigger><SelectValue placeholder="Escolher template" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__custom__">Conteúdo próprio</SelectItem>
                {(templates ?? []).map((template) => (
                  <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {!config.template_id && (
            <>
              <Field label="Assunto">
                <Input
                  value={config.subject ?? ''}
                  onChange={(e) => set({ subject: e.target.value })}
                  placeholder="Ex.: A sua proposta está pronta"
                />
              </Field>
              <Field label="Conteúdo HTML">
                <Textarea
                  value={config.html ?? ''}
                  onChange={(e) => set({ html: e.target.value })}
                  placeholder="<p>Olá {{nome}},</p>"
                  rows={8}
                  className="font-mono text-xs"
                />
              </Field>
            </>
          )}
        </>
      );

    case 'wait':
      return (
        <Field label="Esperar">
          <div className="flex gap-2">
            <Input
              type="number"
              min={1}
              className="w-24"
              value={config.duration ?? 1}
              onChange={(e) => set({ duration: Number(e.target.value) })}
            />
            <Select
              value={config.unit ?? 'hours'}
              onValueChange={(value) => set({ unit: value as AutomationWaitUnit })}
            >
              <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WAIT_UNIT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Field>
      );

    case 'wait_reply':
      return <WaitReplyForm config={config} set={set} />;

    case 'condition':
      return (
        <>
          <Field label="Campo">
            <Select value={config.field ?? ''} onValueChange={(value) => set({ field: value })}>
              <SelectTrigger><SelectValue placeholder="Escolher campo" /></SelectTrigger>
              <SelectContent>
                {CONDITION_FIELD_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Operador">
            <Select
              value={config.operator ?? 'equals'}
              onValueChange={(value) => set({ operator: value as AutomationNodeConfig['operator'] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITION_OPERATOR_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {!VALUELESS_OPERATORS.includes(config.operator ?? 'equals') && (
            <Field label="Valor">
              <Input
                value={config.value ?? ''}
                onChange={(e) => set({ value: e.target.value })}
                placeholder="Valor a comparar"
              />
            </Field>
          )}
          <Hint>O fluxo segue pelo ramo <strong>Sim</strong> quando a condição se verifica e por <strong>Não</strong> caso contrário.</Hint>
        </>
      );

    case 'move_stage':
      return (
        <Field label="Mover para a etapa">
          <StageSelect
            value={config.stage_id ?? ''}
            stages={stages}
            placeholder="Escolher etapa"
            onChange={(value) => set({ stage_id: value })}
          />
        </Field>
      );

    case 'assign_user':
      return (
        <Field label="Atribuir a">
          <Select value={config.user_id ?? ''} onValueChange={(value) => set({ user_id: value })}>
            <SelectTrigger><SelectValue placeholder="Escolher utilizador" /></SelectTrigger>
            <SelectContent>
              {(members ?? []).map((member) => (
                <SelectItem key={member.user_id} value={member.user_id}>
                  {member.full_name || member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );

    case 'add_to_list':
      return (
        <Field label="Lista">
          <Select value={config.list_id ?? ''} onValueChange={(value) => set({ list_id: value })}>
            <SelectTrigger><SelectValue placeholder="Escolher lista" /></SelectTrigger>
            <SelectContent>
              {(lists ?? []).map((list) => (
                <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      );

    case 'create_task':
      return (
        <>
          <Field label="Título da tarefa">
            <Input
              value={config.title ?? ''}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Ex.: Ligar à lead"
            />
          </Field>
          <Field label="Prazo (dias)">
            <Input
              type="number"
              min={0}
              value={config.due_in_days ?? 1}
              onChange={(e) => set({ due_in_days: Number(e.target.value) })}
            />
          </Field>
          <Field label="Responsável (opcional)">
            <Select value={config.assigned_to ?? ''} onValueChange={(value) => set({ assigned_to: value })}>
              <SelectTrigger><SelectValue placeholder="Responsável da lead" /></SelectTrigger>
              <SelectContent>
                {(members ?? []).map((member) => (
                  <SelectItem key={member.user_id} value={member.user_id}>
                    {member.full_name || member.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </>
      );

    case 'webhook':
      return (
        <>
          <Field label="URL">
            <Input
              value={config.url ?? ''}
              onChange={(e) => set({ url: e.target.value })}
              placeholder="https://exemplo.com/hook"
            />
          </Field>
          <Field label="Método">
            <Select
              value={config.method ?? 'POST'}
              onValueChange={(value) => set({ method: value as AutomationNodeConfig['method'] })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['POST', 'GET', 'PUT', 'PATCH'].map((method) => (
                  <SelectItem key={method} value={method}>{method}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Cabeçalhos (JSON)">
            <Textarea
              value={config.headers ?? ''}
              onChange={(e) => set({ headers: e.target.value })}
              placeholder='{"Authorization": "Bearer …"}'
              rows={3}
              className="font-mono text-xs"
            />
          </Field>
          <Field label="Corpo (JSON)">
            <Textarea
              value={config.body ?? ''}
              onChange={(e) => set({ body: e.target.value })}
              placeholder='{"nome": "{{nome}}"}'
              rows={4}
              className="font-mono text-xs"
            />
          </Field>
        </>
      );

    case 'end':
      return <Hint>O fluxo termina aqui para este contacto. Não são executados mais passos.</Hint>;

    default:
      return <Hint>Este passo não tem opções configuráveis.</Hint>;
  }
}

// ── wait_reply: the conversational node ─────────────────────────────────────

function WaitReplyForm({ config, set }: { config: AutomationNodeConfig; set: FormProps['set'] }) {
  const rules = config.rules ?? [];
  const timeout = config.timeout ?? { value: 24, unit: 'hours' as AutomationWaitUnit };

  const updateRule = (id: string, patch: Partial<WaitReplyRule>) => {
    set({ rules: rules.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule)) });
  };

  const addRule = () => {
    set({
      rules: [
        ...rules,
        { id: createId('r'), label: `Opção ${rules.length + 1}`, keywords: [] },
      ],
    });
  };

  const removeRule = (id: string) => {
    set({ rules: rules.filter((rule) => rule.id !== id) });
  };

  return (
    <>
      <Hint>
        O fluxo fica à espera da resposta do contacto. Cada regra abaixo cria um ramo próprio no
        canvas; se ninguém responder dentro do tempo limite, segue pelo ramo <strong>Sem resposta</strong>.
      </Hint>

      <Field label="Tempo limite">
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            className="w-24"
            value={timeout.value}
            onChange={(e) => set({ timeout: { ...timeout, value: Number(e.target.value) } })}
          />
          <Select
            value={timeout.unit}
            onValueChange={(value) => set({ timeout: { ...timeout, unit: value as AutomationWaitUnit } })}
          >
            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WAIT_UNIT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Field>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Regras de resposta
          </Label>
          <Button variant="outline" size="sm" className="h-7" onClick={addRule}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Regra
          </Button>
        </div>

        {!rules.length && (
          <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
            Sem regras. Adicione uma para ramificar consoante o que o contacto responder.
          </p>
        )}

        {rules.map((rule, index) => (
          <div key={rule.id} className="space-y-2 rounded-lg border border-border bg-background p-3">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                {index + 1}
              </span>
              <Input
                value={rule.label}
                onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                placeholder="Nome do ramo"
                className="h-8 flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRule(rule.id)}
                title="Remover regra"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <KeywordsInput
              value={rule.keywords ?? []}
              onChange={(keywords) => updateRule(rule.id, { keywords })}
              className="h-8"
            />
          </div>
        ))}
      </div>
    </>
  );
}

// ── Small building blocks ───────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function Helper({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-snug text-muted-foreground">{children}</p>;
}

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

function StageSelect({
  value, stages, placeholder, onChange,
}: {
  value: string;
  stages: { id: string; name: string }[] | undefined;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {(stages ?? []).map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>{stage.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Comma-separated keyword editor backed by a string[]. */
function KeywordsInput({
  value, onChange, className,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  className?: string;
}) {
  return (
    <Input
      className={className}
      value={value.join(', ')}
      onChange={(e) =>
        onChange(
          e.target.value
            .split(',')
            .map((keyword) => keyword.trim())
            .filter(Boolean),
        )
      }
      placeholder="sim, quero, interessado"
    />
  );
}
