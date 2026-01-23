import { useState, useMemo, useEffect } from 'react';
import { Plus, Minus, X, UserPlus, Zap, Wrench } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/searchable-combobox';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useActiveProducts } from '@/hooks/useProducts';
import { useUpdateProposal, useUpdateProposalProducts, useProposalProducts } from '@/hooks/useProposals';
import { useClients } from '@/hooks/useClients';
import { CreateClientModal } from '@/components/clients/CreateClientModal';
import { 
  PROPOSAL_STATUS_LABELS, 
  PROPOSAL_STATUSES, 
  type ProposalStatus, 
  type ProposalType,
  type ModeloServico,
  type Proposal 
} from '@/types/proposals';

interface EditProposalModalProps {
  proposal: Proposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface SelectedProduct {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export function EditProposalModal({ proposal, open, onOpenChange, onSuccess }: EditProposalModalProps) {
  const { data: products = [] } = useActiveProducts();
  const { data: clients = [] } = useClients();
  const { data: existingProducts = [] } = useProposalProducts(proposal.id);
  const updateProposal = useUpdateProposal();
  const updateProposalProducts = useUpdateProposalProducts();
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [notes, setNotes] = useState('');
  const [proposalDate, setProposalDate] = useState('');
  
  const [additionalValue, setAdditionalValue] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [status, setStatus] = useState<ProposalStatus>('draft');
  
  // Tipo de proposta
  const [proposalType, setProposalType] = useState<ProposalType>('energia');
  
  // Campos Energia
  const [consumoAnual, setConsumoAnual] = useState<string>('');
  const [margem, setMargem] = useState<string>('');
  const [dbl, setDbl] = useState<string>('');
  const [anosContrato, setAnosContrato] = useState<string>('');
  
  // Campos Serviços
  const [modeloServico, setModeloServico] = useState<ModeloServico>('transacional');
  const [kwp, setKwp] = useState<string>('');
  
  // Comum
  const [comissao, setComissao] = useState<string>('');
  
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
      
      // Campos Energia
      setConsumoAnual(proposal.consumo_anual?.toString() || '');
      setMargem(proposal.margem?.toString() || '');
      setDbl(proposal.dbl?.toString() || '');
      setAnosContrato(proposal.anos_contrato?.toString() || '');
      
      // Campos Serviços
      setModeloServico((proposal.modelo_servico as ModeloServico) || 'transacional');
      setKwp(proposal.kwp?.toString() || '');
      
      // Comum
      setComissao(proposal.comissao?.toString() || '');
      
      // Calcular valores adicionais/desconto com base no total e produtos
      setAdditionalValue('');
      setDiscount('');
    }
  }, [open, proposal]);

  // Carregar produtos existentes quando disponíveis
  useEffect(() => {
    if (open && existingProducts.length > 0) {
      setSelectedProducts(
        existingProducts.map(p => ({
          product_id: p.product_id,
          name: p.product?.name || 'Produto',
          quantity: p.quantity,
          unit_price: p.unit_price,
        }))
      );
    } else if (open && existingProducts.length === 0) {
      setSelectedProducts([]);
    }
  }, [open, existingProducts]);

  const productsSubtotal = useMemo(() => {
    return selectedProducts.reduce((sum, p) => sum + (p.quantity * p.unit_price), 0);
  }, [selectedProducts]);

  const totalValue = useMemo(() => {
    const additional = parseFloat(additionalValue) || 0;
    const disc = parseFloat(discount) || 0;
    return Math.max(0, productsSubtotal + additional - disc);
  }, [productsSubtotal, additionalValue, discount]);

  const handleAddProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existing = selectedProducts.find(p => p.product_id === productId);
    if (existing) {
      setSelectedProducts(prev =>
        prev.map(p =>
          p.product_id === productId
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      );
    } else {
      setSelectedProducts(prev => [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          quantity: 1,
          unit_price: product.price || 0,
        },
      ]);
    }
  };

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.product_id !== productId));
  };

  const handleQuantityChange = (productId: string, delta: number) => {
    setSelectedProducts(prev =>
      prev.map(p => {
        if (p.product_id !== productId) return p;
        const newQty = Math.max(1, p.quantity + delta);
        return { ...p, quantity: newQty };
      })
    );
  };

  const handlePriceChange = (productId: string, price: number) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p.product_id === productId
          ? { ...p, unit_price: price }
          : p
      )
    );
  };

  const handleClientCreated = (newClientId: string) => {
    setSelectedClientId(newClientId);
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
      consumo_anual: proposalType === 'energia' ? (parseFloat(consumoAnual) || null) : null,
      margem: proposalType === 'energia' ? (parseFloat(margem) || null) : null,
      dbl: proposalType === 'energia' ? (parseInt(dbl) || null) : null,
      anos_contrato: proposalType === 'energia' ? (parseInt(anosContrato) || null) : null,
      modelo_servico: proposalType === 'servicos' ? modeloServico : null,
      kwp: proposalType === 'servicos' ? (parseFloat(kwp) || null) : null,
      comissao: parseFloat(comissao) || null,
    });

    // Atualizar produtos
    await updateProposalProducts.mutateAsync({
      proposalId: proposal.id,
      products: selectedProducts.map(p => ({
        product_id: p.product_id,
        quantity: p.quantity,
        unit_price: p.unit_price,
        total: p.quantity * p.unit_price,
      })),
    });

    onOpenChange(false);
    onSuccess?.();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const availableProducts = products.filter(
    p => !selectedProducts.find(sp => sp.product_id === p.id)
  );

  const hasAdditional = parseFloat(additionalValue) > 0;
  const hasDiscount = parseFloat(discount) > 0;
  const showBreakdown = selectedProducts.length > 0 || hasAdditional || hasDiscount;

  const isSubmitting = updateProposal.isPending || updateProposalProducts.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Proposta {proposal.code}</DialogTitle>
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

            {/* Campos específicos de Energia */}
            {proposalType === 'energia' && (
              <div className="space-y-4 p-4 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Zap className="h-4 w-4" />
                  <span className="font-medium text-sm">Dados de Energia</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="consumo-anual">Consumo Anual (kWh)</Label>
                    <Input
                      id="consumo-anual"
                      type="number"
                      step="0.01"
                      min="0"
                      value={consumoAnual}
                      onChange={(e) => setConsumoAnual(e.target.value)}
                      placeholder="Ex: 5000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="margem">Margem (€)</Label>
                    <Input
                      id="margem"
                      type="number"
                      step="0.01"
                      min="0"
                      value={margem}
                      onChange={(e) => setMargem(e.target.value)}
                      placeholder="Ex: 150"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="anos-contrato">Anos de Contrato</Label>
                    <Input
                      id="anos-contrato"
                      type="number"
                      min="1"
                      max="10"
                      value={anosContrato}
                      onChange={(e) => setAnosContrato(e.target.value)}
                      placeholder="Ex: 2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comissao-energia">Comissão (€)</Label>
                    <Input
                      id="comissao-energia"
                      type="number"
                      step="0.01"
                      min="0"
                      value={comissao}
                      onChange={(e) => setComissao(e.target.value)}
                      placeholder="Ex: 100"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dbl">DBL</Label>
                  <Input
                    id="dbl"
                    type="number"
                    min="0"
                    value={dbl}
                    onChange={(e) => setDbl(e.target.value)}
                    placeholder="Ex: 1"
                  />
                </div>
              </div>
            )}

            {/* Campos específicos de Serviços */}
            {proposalType === 'servicos' && (
              <div className="space-y-4 p-4 rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                  <Wrench className="h-4 w-4" />
                  <span className="font-medium text-sm">Dados do Serviço</span>
                </div>
                
                <div className="space-y-2">
                  <Label>Modelo de Serviço</Label>
                  <RadioGroup
                    value={modeloServico}
                    onValueChange={(v) => setModeloServico(v as ModeloServico)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="transacional" id="edit-transacional" />
                      <Label htmlFor="edit-transacional" className="cursor-pointer">Transacional</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="saas" id="edit-saas" />
                      <Label htmlFor="edit-saas" className="cursor-pointer">SAAS</Label>
                    </div>
                  </RadioGroup>
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
                      value={comissao}
                      onChange={(e) => setComissao(e.target.value)}
                      placeholder="Ex: 250"
                    />
                  </div>
                </div>
              </div>
            )}

            <Separator className="my-2" />
            <div className="space-y-2">
              <Label>Produtos/Serviços</Label>
              {availableProducts.length > 0 && (
                <Select onValueChange={handleAddProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Adicionar produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price || 0)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum produto selecionado.
                </p>
              ) : (
                <div className="space-y-2 mt-2">
                  {selectedProducts.map((product) => (
                    <div
                      key={product.product_id}
                      className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(product.product_id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{product.quantity}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleQuantityChange(product.product_id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-xs text-muted-foreground">×</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={product.unit_price}
                            onChange={(e) => handlePriceChange(product.product_id, parseFloat(e.target.value) || 0)}
                            className="w-24 h-7 text-sm"
                          />
                          <span className="text-xs text-muted-foreground">€</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">
                          {formatCurrency(product.quantity * product.unit_price)}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 mt-1"
                          onClick={() => handleRemoveProduct(product.product_id)}
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Valor Adicional e Desconto */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="additional-value">Valor Adicional</Label>
                <Input
                  id="additional-value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={additionalValue}
                  onChange={(e) => setAdditionalValue(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Desconto</Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Total com breakdown */}
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-2">
              {showBreakdown && (
                <div className="text-sm text-muted-foreground space-y-1">
                  {selectedProducts.length > 0 && (
                    <div className="flex justify-between">
                      <span>Subtotal Produtos</span>
                      <span>{formatCurrency(productsSubtotal)}</span>
                    </div>
                  )}
                  {hasAdditional && (
                    <div className="flex justify-between text-green-600">
                      <span>+ Valor Adicional</span>
                      <span>{formatCurrency(parseFloat(additionalValue))}</span>
                    </div>
                  )}
                  {hasDiscount && (
                    <div className="flex justify-between text-red-500">
                      <span>- Desconto</span>
                      <span>-{formatCurrency(parseFloat(discount))}</span>
                    </div>
                  )}
                </div>
              )}
              <div className={`flex items-center justify-between ${showBreakdown ? 'pt-2 border-t border-primary/20' : ''}`}>
                <span className="font-medium">Total da Proposta</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</span>
              </div>
            </div>

            <Separator className="my-2" />

            <div className="space-y-2">
              <Label htmlFor="notes">Observações da Negociação</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas internas sobre a negociação..."
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'A guardar...' : 'Guardar Alterações'}
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
