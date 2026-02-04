import { useState, useMemo, useEffect } from 'react';
import { X, UserPlus, Zap, Wrench, Package } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/searchable-combobox';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateProposal } from '@/hooks/useProposals';
import { useClients } from '@/hooks/useClients';
import { useActiveProducts } from '@/hooks/useProducts';
import { useAuth } from '@/contexts/AuthContext';
import { CreateClientModal } from '@/components/clients/CreateClientModal';
import { ProposalCpeSelector, type ProposalCpeDraft } from './ProposalCpeSelector';
import { useProposalCpes, useUpdateProposalCpes } from '@/hooks/useProposalCpes';
import { 
  PROPOSAL_STATUS_LABELS, 
  PROPOSAL_STATUSES, 
  NEGOTIATION_TYPE_LABELS,
  NEGOTIATION_TYPES,
  SERVICOS_PRODUCTS,
  type ProposalStatus, 
  type ProposalType,
  type ModeloServico,
  type NegotiationType,
  type Proposal 
} from '@/types/proposals';

interface EditProposalModalProps {
  proposal: Proposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditProposalModal({ proposal, open, onOpenChange, onSuccess }: EditProposalModalProps) {
  const { data: clients = [] } = useClients();
  const { data: products = [] } = useActiveProducts();
  const { data: existingCpes = [] } = useProposalCpes(proposal.id);
  const { organization } = useAuth();
  const updateProposal = useUpdateProposal();
  const updateProposalCpes = useUpdateProposalCpes();
  
  // Verificar se é nicho telecom
  const isTelecom = organization?.niche === 'telecom';
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [proposalDate, setProposalDate] = useState('');
  const [status, setStatus] = useState<ProposalStatus>('draft');
  
  // Tipo de negociação (apenas telecom)
  const [negotiationType, setNegotiationType] = useState<NegotiationType | null>(null);
  
  // Tipo de proposta (apenas telecom)
  const [proposalType, setProposalType] = useState<ProposalType>('energia');
  
  // Campos Serviços (apenas telecom)
  const [modeloServico, setModeloServico] = useState<ModeloServico>('transacional');
  const [kwp, setKwp] = useState<string>('');
  const [servicosComissao, setServicosComissao] = useState<string>('');
  const [servicosProdutos, setServicosProdutos] = useState<string[]>([]);
  
  // CPEs para propostas de energia (apenas telecom)
  const [proposalCpes, setProposalCpes] = useState<ProposalCpeDraft[]>([]);
  
  // Campos para nichos NÃO-telecom
  const [manualValue, setManualValue] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
  }>>([]);
  
  // Modal para criar novo cliente
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);

  // Preencher formulário quando modal abre
  useEffect(() => {
    if (open && proposal) {
      setSelectedClientId(proposal.client_id || null);
      setNotes(proposal.notes || '');
      setProposalDate(proposal.proposal_date?.split('T')[0] || new Date().toISOString().split('T')[0]);
      setStatus(proposal.status);
      setProposalType((proposal.proposal_type as ProposalType) || 'energia');
      setNegotiationType((proposal.negotiation_type as NegotiationType) || null);
      
      // Campos Serviços (telecom)
      setModeloServico((proposal.modelo_servico as ModeloServico) || 'transacional');
      setKwp(proposal.kwp?.toString() || '');
      setServicosComissao(proposal.comissao?.toString() || '');
      setServicosProdutos(proposal.servicos_produtos || []);
      
      // Campos não-telecom
      if (!isTelecom) {
        setManualValue(proposal.total_value?.toString() || '');
        // TODO: Carregar produtos selecionados se existir tabela proposal_products
        setSelectedProducts([]);
      }
    }
  }, [open, proposal, isTelecom]);

  // Carregar CPEs existentes quando disponíveis
  useEffect(() => {
    if (open && existingCpes.length > 0) {
      setProposalCpes(
        existingCpes.map(cpe => ({
          id: cpe.id,
          existing_cpe_id: cpe.existing_cpe_id,
          equipment_type: cpe.equipment_type,
          serial_number: cpe.serial_number || '',
          comercializador: cpe.comercializador,
          fidelizacao_start: cpe.fidelizacao_start || '',
          fidelizacao_end: cpe.fidelizacao_end || '',
          notes: cpe.notes || '',
          isNew: !cpe.existing_cpe_id,
          // Novos campos de energia por CPE
          consumo_anual: cpe.consumo_anual?.toString() || '',
          duracao_contrato: cpe.duracao_contrato?.toString() || '',
          dbl: cpe.dbl?.toString() || '',
          margem: cpe.margem?.toString() || '',
          comissao: cpe.comissao?.toString() || '',
          contrato_inicio: cpe.contrato_inicio || '',
          contrato_fim: cpe.contrato_fim || '',
        }))
      );
    } else if (open) {
      setProposalCpes([]);
    }
  }, [open, existingCpes]);

  // Calcular total baseado nos CPEs (soma das margens + comissões) para energia
  const totalValue = useMemo(() => {
    if (isTelecom) {
      if (proposalType === 'energia') {
        return proposalCpes.reduce((sum, cpe) => {
          const margem = parseFloat(cpe.margem) || 0;
          const comissao = parseFloat(cpe.comissao) || 0;
          return sum + margem + comissao;
        }, 0);
      }
      // Para serviços telecom, usar comissão
      return parseFloat(servicosComissao) || 0;
    }
    // Para não-telecom: valor manual + produtos
    const productsTotal = selectedProducts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
    return productsTotal + (parseFloat(manualValue) || 0);
  }, [isTelecom, proposalType, proposalCpes, servicosComissao, selectedProducts, manualValue]);

  const handleClientCreated = (newClientId: string) => {
    setSelectedClientId(newClientId);
  };

  const handleServicosProdutoToggle = (produto: string, checked: boolean) => {
    if (checked) {
      setServicosProdutos(prev => [...prev, produto]);
    } else {
      setServicosProdutos(prev => prev.filter(p => p !== produto));
    }
  };

  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = selectedProducts.find(p => p.product_id === productId);
    if (existing) {
      setSelectedProducts(prev => 
        prev.map(p => p.product_id === productId ? { ...p, quantity: p.quantity + 1 } : p)
      );
    } else {
      setSelectedProducts(prev => [...prev, {
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.price || 0,
      }]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.product_id !== productId));
  };

  const handleUpdateProductQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveProduct(productId);
      return;
    }
    setSelectedProducts(prev => 
      prev.map(p => p.product_id === productId ? { ...p, quantity } : p)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Atualizar proposta
    await updateProposal.mutateAsync({
      id: proposal.id,
      client_id: selectedClientId || null,
      total_value: totalValue,
      status: status,
      notes: notes.trim() || null,
      proposal_date: proposalDate,
      proposal_type: proposalType,
      negotiation_type: negotiationType,
      // Campos legacy ao nível da proposta - limpar
      consumo_anual: null,
      margem: null,
      dbl: null,
      anos_contrato: null,
      // Campos Serviços
      modelo_servico: proposalType === 'servicos' ? modeloServico : null,
      kwp: proposalType === 'servicos' ? (parseFloat(kwp) || null) : null,
      comissao: proposalType === 'servicos' ? (parseFloat(servicosComissao) || null) : null,
      servicos_produtos: proposalType === 'servicos' ? servicosProdutos : null,
    });

    // Atualizar CPEs (apenas para propostas de energia)
    if (proposalType === 'energia') {
      await updateProposalCpes.mutateAsync({
        proposalId: proposal.id,
        cpes: proposalCpes.map(cpe => ({
          proposal_id: proposal.id,
          existing_cpe_id: cpe.existing_cpe_id || null,
          equipment_type: cpe.equipment_type,
          serial_number: cpe.serial_number || null,
          comercializador: cpe.comercializador,
          fidelizacao_start: cpe.fidelizacao_start || null,
          fidelizacao_end: cpe.fidelizacao_end || null,
          notes: cpe.notes || null,
          // Dados de energia por CPE
          consumo_anual: cpe.consumo_anual ? parseFloat(cpe.consumo_anual) : null,
          duracao_contrato: cpe.duracao_contrato ? parseInt(cpe.duracao_contrato) : null,
          dbl: cpe.dbl ? parseFloat(cpe.dbl) : null,
          margem: cpe.margem ? parseFloat(cpe.margem) : null,
          comissao: cpe.comissao ? parseFloat(cpe.comissao) : null,
          contrato_inicio: cpe.contrato_inicio || null,
          contrato_fim: cpe.contrato_fim || null,
        })),
      });
    }

    onOpenChange(false);
    onSuccess?.();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const isSubmitting = updateProposal.isPending || updateProposalCpes.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md px-0 pb-0 pt-safe flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle>Editar Proposta {proposal.code}</SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

              {/* Tipo de Negociação - Apenas Telecom */}
              {isTelecom && (
                <div className="space-y-3">
                  <Label>Tipo de Negociação</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {NEGOTIATION_TYPES.map((type) => (
                      <Button
                        key={type}
                        type="button"
                        variant={negotiationType === type ? 'default' : 'outline'}
                        size="sm"
                        className="text-xs"
                        onClick={() => setNegotiationType(type)}
                      >
                        {NEGOTIATION_TYPE_LABELS[type]}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tipo de Proposta - Apenas Telecom */}
              {isTelecom && (
                <div className="space-y-3">
                  <Label>Tipo de Proposta</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={proposalType === 'energia' ? 'default' : 'outline'}
                      className="flex items-center justify-center gap-2 h-10"
                      onClick={() => setProposalType('energia')}
                    >
                      <Zap className="h-4 w-4" />
                      Energia
                    </Button>
                    <Button
                      type="button"
                      variant={proposalType === 'servicos' ? 'default' : 'outline'}
                      className="flex items-center justify-center gap-2 h-10"
                      onClick={() => setProposalType('servicos')}
                    >
                      <Wrench className="h-4 w-4" />
                      Outros Serviços
                    </Button>
                  </div>
                </div>
              )}

              {/* CPE Selector para propostas de Energia - Apenas Telecom */}
              {isTelecom && proposalType === 'energia' && (
                <>
                  <Separator className="my-2" />
                  <ProposalCpeSelector
                    clientId={selectedClientId}
                    cpes={proposalCpes}
                    onCpesChange={setProposalCpes}
                  />
                </>
              )}

              {/* Campos específicos de Serviços - Apenas Telecom */}
              {isTelecom && proposalType === 'servicos' && (
                <div className="space-y-4 p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Wrench className="h-4 w-4" />
                    <span className="font-medium text-sm">Dados do Serviço</span>
                  </div>
                  
                  {/* Produtos fixos com checkboxes */}
                  <div className="space-y-2">
                    <Label className="text-xs">Produtos</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {SERVICOS_PRODUCTS.map((produto) => (
                        <div key={produto} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-produto-${produto}`}
                            checked={servicosProdutos.includes(produto)}
                            onCheckedChange={(checked) => handleServicosProdutoToggle(produto, !!checked)}
                          />
                          <Label 
                            htmlFor={`edit-produto-${produto}`} 
                            className="text-sm cursor-pointer"
                          >
                            {produto}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">Modelo de Serviço</Label>
                    <RadioGroup
                      value={modeloServico}
                      onValueChange={(v) => setModeloServico(v as ModeloServico)}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="transacional" id="edit-transacional" />
                        <Label htmlFor="edit-transacional" className="cursor-pointer text-sm">Transacional</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="saas" id="edit-saas" />
                        <Label htmlFor="edit-saas" className="cursor-pointer text-sm">SAAS</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="edit-kwp" className="text-xs">Potência (kWp)</Label>
                      <Input
                        id="edit-kwp"
                        type="number"
                        step="0.01"
                        min="0"
                        value={kwp}
                        onChange={(e) => setKwp(e.target.value)}
                        placeholder="Ex: 6.5"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="edit-comissao-servicos" className="text-xs">Comissão (€)</Label>
                      <Input
                        id="edit-comissao-servicos"
                        type="number"
                        step="0.01"
                        min="0"
                        value={servicosComissao}
                        onChange={(e) => setServicosComissao(e.target.value)}
                        placeholder="Ex: 250"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Total calculado */}
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Total da Proposta</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(totalValue)}</span>
                </div>
                {proposalType === 'energia' && proposalCpes.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Soma das margens e comissões de {proposalCpes.length} CPE(s)
                  </p>
                )}
              </div>

              <Separator />

              {/* Campos para nichos NÃO-telecom */}
              {!isTelecom && (
                <div className="space-y-4">
                  <Separator />
                  
                  {/* Valor da Proposta */}
                  <div className="space-y-2">
                    <Label htmlFor="manual-value" className="text-xs">Valor da Proposta (€)</Label>
                    <Input
                      id="manual-value"
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      placeholder="Ex: 1500.00"
                      className="h-9"
                    />
                  </div>
                  
                  {/* Produtos/Serviços */}
                  {products.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-xs">Produtos/Serviços</Label>
                      
                      <Select onValueChange={handleAddProduct}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Adicionar produto/serviço..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} {product.price ? `- ${formatCurrency(product.price)}` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {selectedProducts.length > 0 && (
                        <div className="space-y-2">
                          {selectedProducts.map((item) => (
                            <div key={item.product_id} className="flex items-center gap-2 p-2 rounded-lg bg-muted">
                              <Package className="h-4 w-4 text-muted-foreground" />
                              <span className="flex-1 text-sm truncate">{item.name}</span>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateProductQuantity(item.product_id, parseInt(e.target.value) || 0)}
                                className="w-14 h-7 text-center text-xs"
                              />
                              <span className="text-xs text-muted-foreground w-16 text-right">
                                {formatCurrency(item.quantity * item.unit_price)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => handleRemoveProduct(item.product_id)}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Resumo do valor */}
                  {(parseFloat(manualValue) > 0 || selectedProducts.length > 0) && (
                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Total da Proposta</span>
                        <span className="text-lg font-bold text-primary">{formatCurrency(totalValue)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                <Label htmlFor="notes" className="text-xs">Observações da Negociação</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalhes da negociação, condições especiais, etc..."
                  rows={3}
                />
              </div>

              {/* Footer com botões */}
              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'A guardar...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <CreateClientModal
        open={isCreateClientOpen}
        onOpenChange={setIsCreateClientOpen}
        onCreated={handleClientCreated}
      />
    </>
  );
}
