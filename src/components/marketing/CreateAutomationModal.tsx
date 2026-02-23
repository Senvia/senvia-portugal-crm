import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/searchable-combobox';
import { useAutomations, TRIGGER_TYPES, DELAY_OPTIONS } from '@/hooks/useAutomations';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { useContactLists } from '@/hooks/useContactLists';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAutomationModal({ open, onOpenChange }: Props) {
  const { createAutomation } = useAutomations();
  const { data: templates } = useEmailTemplates();
  const { data: stages } = usePipelineStages();
  const { data: lists } = useContactLists();

  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [listId, setListId] = useState('');
  const [fromStatus, setFromStatus] = useState('');
  const [toStatus, setToStatus] = useState('');

  const showStatusConfig = triggerType === 'lead_status_changed' || triggerType === 'client_status_changed';

  const triggerOptions: ComboboxOption[] = TRIGGER_TYPES.map(t => ({ value: t.value, label: t.label }));
  const listOptions: ComboboxOption[] = (lists || []).map(l => ({ value: l.id, label: `${l.name} (${l.member_count})` }));

  const handleSubmit = () => {
    if (!name || !triggerType || !templateId || !listId) return;

    const triggerConfig: Record<string, string> = {};
    if (showStatusConfig) {
      if (fromStatus) triggerConfig.from_status = fromStatus;
      if (toStatus) triggerConfig.to_status = toStatus;
    }

    createAutomation.mutate(
      { name, trigger_type: triggerType, trigger_config: triggerConfig, template_id: templateId, delay_minutes: delayMinutes, list_id: listId },
      {
        onSuccess: () => {
          onOpenChange(false);
          setName('');
          setTriggerType('');
          setTemplateId('');
          setDelayMinutes(0);
          setListId('');
          setFromStatus('');
          setToStatus('');
        },
      }
    );
  };

  const activeTemplates = (templates || []).filter(t => t.is_active);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Automação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <Label>Nome da automação</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Boas-vindas ao lead" />
          </div>

          <div>
            <Label>Gatilho</Label>
            <SearchableCombobox
              options={triggerOptions}
              value={triggerType || null}
              onValueChange={(val) => setTriggerType(val || '')}
              placeholder="Selecionar gatilho"
              searchPlaceholder="Pesquisar gatilho..."
              emptyText="Nenhum gatilho encontrado."
              emptyLabel="Nenhum"
            />
          </div>

          {showStatusConfig && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>De qual etapa?</Label>
                <Select value={fromStatus} onValueChange={setFromStatus}>
                  <SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Qualquer</SelectItem>
                    {stages?.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Para qual etapa?</Label>
                <Select value={toStatus} onValueChange={setToStatus}>
                  <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
                  <SelectContent>
                    {stages?.map(s => (
                      <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label>Template de Email</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder="Selecionar template" /></SelectTrigger>
              <SelectContent>
                {activeTemplates.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Lista de Destinatários</Label>
            <SearchableCombobox
              options={listOptions}
              value={listId || null}
              onValueChange={(val) => setListId(val || '')}
              placeholder="Selecionar lista"
              searchPlaceholder="Pesquisar lista..."
              emptyText="Nenhuma lista encontrada."
              emptyLabel="Nenhuma"
            />
          </div>

          <div>
            <Label>Atraso antes de enviar</Label>
            <Select value={String(delayMinutes)} onValueChange={v => setDelayMinutes(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DELAY_OPTIONS.map(d => (
                  <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSubmit} disabled={!name || !triggerType || !templateId || !listId || createAutomation.isPending} className="w-full">
            {createAutomation.isPending ? 'A criar...' : 'Criar Automação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
