import { useState, useMemo, useEffect } from 'react';
import { Plus, UserPlus, Zap, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/searchable-combobox';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useCreateProposal } from '@/hooks/useProposals';
import { useClients } from '@/hooks/useClients';
import { useCreateProposalCpesBatch } from '@/hooks/useProposalCpes';
import { CreateClientModal } from '@/components/clients/CreateClientModal';
import { ProposalCpeSelector, type ProposalCpeDraft } from '@/components/proposals/ProposalCpeSelector';
import { useAuth } from '@/contexts/AuthContext';
import type { CrmClient } from '@/types/clients';
import { 
  PROPOSAL_STATUS_LABELS, 
  PROPOSAL_STATUSES, 
  NEGOTIATION_TYPE_LABELS,
  NEGOTIATION_TYPES,
  SERVICOS_PRODUCTS,
  type ProposalStatus, 
  type ProposalType,
  type NegotiationType,
  type Proposal 
} from '@/types/proposals';

interface CreateProposalModalProps {
  client?: CrmClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (proposal: Proposal) => void;
  preselectedClientId?: string | null;
  leadId?: string | null;
}

export function CreateProposalModal({ client, open, onOpenChange, onSuccess, preselectedClientId, leadId }: CreateProposalModalProps) {
  const { data: clients = [] } = useClients();
  const { organization } = useAuth();
  const createProposal = useCreateProposal();
  const createProposalCpesBatch = useCreateProposalCpesBatch();
  
  // Only show telecom-specific UI for telecom niche
  const isTelecom = organization?.niche === 'telecom';
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(client?.id || null);
  const [notes, setNotes] = useState('');
  const [proposalDate, setProposalDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<ProposalStatus>('draft');
  
  // Tipo de proposta e negociação
  const [proposalType, setProposalType] = useState<ProposalType>('energia');
  const [negotiationType, setNegotiationType] = useState<NegotiationType>('angariacao');
  
  // Campos Serviços
  const [kwp, setKwp] = useState<string>('');
  const [comissaoServicos, setComissaoServicos] = useState<string>('');
  const [servicosProdutos, setServicosProdutos] = useState<string[]>([]);
  
  // CPEs para a proposta (apenas energia)
  const [proposalCpes, setProposalCpes] = useState<ProposalCpeDraft[]>([]);
  
  // Modal para criar novo cliente
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);

  // Update selectedClientId when client prop or preselectedClientId changes
  useEffect(() => {
    if (open) {
      if (preselectedClientId) {
        setSelectedClientId(preselectedClientId);
      } else if (client?.id) {
        setSelectedClientId(client.id);
      }
    }
  }, [open, client?.id, preselectedClientId]);

  // Calculate total value from CPEs (sum of margens)
  const totalValue = useMemo(() => {
    if (proposalType === 'energia') {
      return proposalCpes.reduce((sum, cpe) => {
        return sum + (parseFloat(cpe.margem) || 0);
      }, 0);
    }
    return 0;
  }, [proposalType, proposalCpes]);

  // Calculate total commission from CPEs
  const totalComissao = useMemo(() => {
    if (proposalType === 'energia') {
      return proposalCpes.reduce((sum, cpe) => {
        return sum + (parseFloat(cpe.comissao) || 0);
      }, 0);
    }
    return parseFloat(comissaoServicos) || 0;
  }, [proposalType, proposalCpes, comissaoServicos]);

  const handleClientCreated = (newClientId: string) => {
    setSelectedClientId(newClientId);
  };

  const handleToggleServicoProduto = (produto: string) => {
    setServicosProdutos(prev => 
      prev.includes(produto) 
        ? prev.filter(p => p !== produto)
        : [...prev, produto]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    createProposal.mutate({
      client_id: selectedClientId || undefined,
      lead_id: leadId || undefined,
      total_value: totalValue,
      status: status,
      notes: notes.trim() || undefined,
      proposal_date: proposalDate,
      products: [], // No longer using products for telecom
      proposal_type: proposalType,
      negotiation_type: isTelecom ? negotiationType : undefined,
      // Serviços fields
      kwp: proposalType === 'servicos' ? (parseFloat(kwp) || undefined) : undefined,
      comissao: totalComissao || undefined,
      servicos_produtos: proposalType === 'servicos' && servicosProdutos.length > 0 ? servicosProdutos : undefined,
    }, {
      onSuccess: async (createdProposal) => {
        // Criar CPEs da proposta se existirem
        if (proposalCpes.length > 0 && createdProposal?.id) {
          await createProposalCpesBatch.mutateAsync(
            proposalCpes.map(cpe => ({
              proposal_id: createdProposal.id,
              existing_cpe_id: cpe.existing_cpe_id,
              equipment_type: cpe.equipment_type,
              serial_number: cpe.serial_number || null,
              comercializador: cpe.comercializador,
              fidelizacao_start: cpe.fidelizacao_start || null,
              fidelizacao_end: cpe.fidelizacao_end || null,
              notes: cpe.notes || null,
              consumo_anual: cpe.consumo_anual ? parseFloat(cpe.consumo_anual) : null,
              duracao_contrato: cpe.duracao_contrato ? parseInt(cpe.duracao_contrato) : null,
              dbl: cpe.dbl ? parseFloat(cpe.dbl) : null,
              margem: cpe.margem ? parseFloat(cpe.margem) : null,
              comissao: cpe.comissao ? parseFloat(cpe.comissao) : null,
              contrato_inicio: cpe.contrato_inicio || null,
              contrato_fim: cpe.contrato_fim || null,
            }))
          );
        }
        
        // Reset form
        setSelectedClientId(null);
        setNotes('');
        setProposalDate(new Date().toISOString().split('T')[0]);
        setStatus('draft');
        setProposalCpes([]);
        setProposalType('energia');
        setNegotiationType('angariacao');
        setKwp('');
        setComissaoServicos('');
        setServicosProdutos([]);
        
        onOpenChange(false);
        onSuccess?.(createdProposal as Proposal);
      },
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Proposta</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Client Selector */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <div className="flex gap-2">
                <SearchableCombobox
                  options={clients.map((c): ComboboxOption => ({
                    value: c.id,
                    label: c.name,
                    sublabel: c.code || c.email || undefined,
                  }))}
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                  placeholder="Selecionar cliente..."
                  searchPlaceholder="Pesquisar cliente..."
                  emptyLabel="Sem cliente associado"
                  emptyText="Nenhum cliente encontrado."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setIsCreateClientOpen(true)}
                  title="Novo Cliente"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="proposal-date">Data da Proposta</Label>
                <Input
                  id="proposal-date"
                  type="date"
                  value={proposalDate}
                  onChange={(e) => setProposalDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ProposalStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPOSAL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {PROPOSAL_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tipo de Negociação (apenas telecom) */}
            {isTelecom && (
              <div className="space-y-2">
                <Label>Tipo de Negociação</Label>
                <div className="grid grid-cols-2 gap-2">
                  {NEGOTIATION_TYPES.map((type) => (
                    <Button
                      key={type}
                      type="button"
                      variant={negotiationType === type ? 'default' : 'outline'}
                      size="sm"
                      className="h-9 text-xs"
                      onClick={() => setNegotiationType(type)}
                    >
                      {NEGOTIATION_TYPE_LABELS[type]}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Tipo de Proposta */}
            <div className="space-y-3">
              <Label>Tipo de Proposta</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={proposalType === 'energia' ? 'default' : 'outline'}
                  className="flex items-center justify-center gap-2 h-12"
                  onClick={() => setProposalType('energia')}
                >
                  <Zap className="h-4 w-4" />
                  Energia
                </Button>
                <Button
                  type="button"
                  variant={proposalType === 'servicos' ? 'default' : 'outline'}
                  className="flex items-center justify-center gap-2 h-12"
                  onClick={() => setProposalType('servicos')}
                >
                  <Wrench className="h-4 w-4" />
                  Outros Serviços
                </Button>
              </div>
            </div>

            {/* CPE Selector para propostas de Energia */}
            {proposalType === 'energia' && (
              <>
                <Separator />
                <ProposalCpeSelector
                  clientId={selectedClientId}
                  cpes={proposalCpes}
                  onCpesChange={setProposalCpes}
                />
              </>
            )}

            {/* Campos específicos de Serviços */}
            {proposalType === 'servicos' && (
              <div className="space-y-4 p-4 rounded-lg border bg-secondary/30 border-border">
                <div className="flex items-center gap-2 text-foreground">
                  <Wrench className="h-4 w-4" />
                  <span className="font-medium text-sm">Dados do Serviço</span>
                </div>
                
                {/* Produtos fixos (checkboxes) */}
                <div className="space-y-2">
                  <Label className="text-sm">Produtos</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SERVICOS_PRODUCTS.map((produto) => (
                      <div key={produto} className="flex items-center space-x-2">
                        <Checkbox
                          id={`produto-${produto}`}
                          checked={servicosProdutos.includes(produto)}
                          onCheckedChange={() => handleToggleServicoProduto(produto)}
                        />
                        <Label 
                          htmlFor={`produto-${produto}`} 
                          className="text-sm cursor-pointer"
                        >
                          {produto}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="kwp">Potência (kWp)</Label>
                    <Input
                      id="kwp"
                      type="number"
                      step="0.01"
                      min="0"
                      value={kwp}
                      onChange={(e) => setKwp(e.target.value)}
                      placeholder="Ex: 6.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comissao-servicos">Comissão (€)</Label>
                    <Input
                      id="comissao-servicos"
                      type="number"
                      step="0.01"
                      min="0"
                      value={comissaoServicos}
                      onChange={(e) => setComissaoServicos(e.target.value)}
                      placeholder="Ex: 500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionais..."
                rows={2}
              />
            </div>

            {/* Summary */}
            {proposalType === 'energia' && proposalCpes.length > 0 && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <div className="flex justify-between">
                  <span>CPE/CUI adicionados:</span>
                  <span className="font-medium">{proposalCpes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Margem Total:</span>
                  <span className="font-medium text-primary">{formatCurrency(totalValue)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comissão Total:</span>
                  <span className="font-medium">{formatCurrency(totalComissao)}</span>
                </div>
              </div>
            )}

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createProposal.isPending}>
                {createProposal.isPending ? 'A criar...' : 'Criar Proposta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CreateClientModal
        open={isCreateClientOpen}
        onOpenChange={setIsCreateClientOpen}
        onCreated={handleClientCreated}
      />
    </>
  );
}