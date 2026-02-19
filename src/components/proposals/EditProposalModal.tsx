import { useState, useMemo, useEffect } from 'react';
import { X, UserPlus, Zap, Wrench, Package, FileText, User, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/searchable-combobox';
import { Separator } from '@/components/ui/separator';


import { Checkbox } from '@/components/ui/checkbox';
import { useUpdateProposal, useProposalProducts, useUpdateProposalProducts } from '@/hooks/useProposals';
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
  SERVICOS_PRODUCT_CONFIGS,
  FIELD_LABELS,
  type ServicosDetails,
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
  const { data: existingProducts = [] } = useProposalProducts(proposal.id);
  const { organization } = useAuth();
  const updateProposal = useUpdateProposal();
  const updateProposalCpes = useUpdateProposalCpes();
  const updateProposalProducts = useUpdateProposalProducts();
  
  const isTelecom = organization?.niche === 'telecom';
  
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [proposalDate, setProposalDate] = useState('');
  const [status, setStatus] = useState<ProposalStatus>('draft');
  
  const [negotiationType, setNegotiationType] = useState<NegotiationType | null>(null);
  const [proposalType, setProposalType] = useState<ProposalType>('energia');
  
  const [modeloServico, setModeloServico] = useState<ModeloServico>('transacional');
  const [kwp, setKwp] = useState<string>('');
  const [servicosComissao, setServicosComissao] = useState<string>('');
  const [servicosProdutos, setServicosProdutos] = useState<string[]>([]);
  const [servicosDetails, setServicosDetails] = useState<ServicosDetails>({});
  
  const [proposalCpes, setProposalCpes] = useState<ProposalCpeDraft[]>([]);
  
  const [selectedProducts, setSelectedProducts] = useState<Array<{
    product_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    discount_type: 'percentage' | 'fixed';
    discount_value: number;
  }>>([]);
  
  const [isCreateClientOpen, setIsCreateClientOpen] = useState(false);

  useEffect(() => {
    if (open && proposal) {
      setSelectedClientId(proposal.client_id || null);
      setNotes(proposal.notes || '');
      setProposalDate(proposal.proposal_date?.split('T')[0] || new Date().toISOString().split('T')[0]);
      setStatus(proposal.status);
      setProposalType((proposal.proposal_type as ProposalType) || 'energia');
      setNegotiationType((proposal.negotiation_type as NegotiationType) || null);
      
      setModeloServico((proposal.modelo_servico as ModeloServico) || 'transacional');
      setKwp(proposal.kwp?.toString() || '');
      setServicosComissao(proposal.comissao?.toString() || '');
      setServicosProdutos(proposal.servicos_produtos || []);
      setServicosDetails((proposal as any).servicos_details || {});
      
      if (!isTelecom && existingProducts.length > 0) {
        setSelectedProducts(existingProducts.map(pp => ({
          product_id: pp.product_id,
          name: pp.product?.name || 'Produto',
          quantity: pp.quantity,
          unit_price: pp.unit_price,
          discount_type: 'percentage' as const,
          discount_value: 0,
        })));
      } else if (!isTelecom) {
        setSelectedProducts([]);
      }
    }
  }, [open, proposal, isTelecom, existingProducts]);

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

  const getProductTotal = (product: typeof selectedProducts[0]) => {
    const subtotal = product.quantity * product.unit_price;
    if (product.discount_type === 'percentage') {
      return subtotal * (1 - product.discount_value / 100);
    }
    return Math.max(0, subtotal - product.discount_value);
  };

  const totalValue = useMemo(() => {
    if (isTelecom) {
      if (proposalType === 'energia') {
        return proposalCpes.reduce((sum, cpe) => sum + (parseFloat(cpe.margem) || 0), 0);
      }
      return parseFloat(servicosComissao) || 0;
    }
    const productsTotal = selectedProducts.reduce((sum, p) => sum + getProductTotal(p), 0);
    return productsTotal;
  }, [isTelecom, proposalType, proposalCpes, servicosComissao, selectedProducts]);

  const totalComissao = useMemo(() => {
    if (proposalType === 'energia') {
      return proposalCpes.reduce((sum, cpe) => sum + (parseFloat(cpe.comissao) || 0), 0);
    }
    return servicosProdutos.reduce((sum, p) => sum + (servicosDetails[p]?.comissao || 0), 0);
  }, [proposalType, proposalCpes, servicosProdutos, servicosDetails]);

  const handleClientCreated = (newClientId: string) => {
    setSelectedClientId(newClientId);
  };

  const handleServicosProdutoToggle = (produto: string, checked: boolean) => {
    if (checked) {
      setServicosProdutos(prev => [...prev, produto]);
    } else {
      setServicosProdutos(prev => prev.filter(p => p !== produto));
      setServicosDetails(d => { const n = { ...d }; delete n[produto]; return n; });
    }
  };

  const handleUpdateProductDetail = (produto: string, field: string, value: number | undefined) => {
    setServicosDetails(prev => {
      const detail = { ...prev[produto], [field]: value };
      const config = SERVICOS_PRODUCT_CONFIGS.find(c => c.name === produto);
      if (config?.kwpAuto && field !== 'kwp') {
        const autoKwp = config.kwpAuto(detail);
        if (autoKwp !== null) detail.kwp = Math.round(autoKwp * 100) / 100;
      }
      return { ...prev, [produto]: detail };
    });
  };

  const totalKwp = useMemo(() => {
    return Object.values(servicosDetails).reduce((sum, d) => sum + (d.kwp || 0), 0);
  }, [servicosDetails]);

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
        discount_type: 'percentage' as const,
        discount_value: 0,
      }]);
    }
  };

  const handleUpdateProductPrice = (productId: string, price: number) => {
    setSelectedProducts(prev => 
      prev.map(p => p.product_id === productId ? { ...p, unit_price: price } : p)
    );
  };

  const handleUpdateProductDiscount = (
    productId: string, 
    discountType: 'percentage' | 'fixed', 
    discountValue: number
  ) => {
    setSelectedProducts(prev => 
      prev.map(p => p.product_id === productId 
        ? { ...p, discount_type: discountType, discount_value: discountValue } 
        : p
      )
    );
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updateProposal.mutateAsync({
      id: proposal.id,
      client_id: selectedClientId || null,
      total_value: totalValue,
      status: status,
      notes: notes.trim() || null,
      proposal_date: proposalDate,
      proposal_type: proposalType,
      negotiation_type: negotiationType,
      consumo_anual: null,
      margem: null,
      dbl: null,
      anos_contrato: null,
      modelo_servico: proposalType === 'servicos' ? modeloServico : null,
      kwp: proposalType === 'servicos' ? (totalKwp || null) : null,
      comissao: proposalType === 'servicos' ? (totalComissao || null) : null,
      servicos_produtos: proposalType === 'servicos' ? servicosProdutos : null,
      servicos_details: proposalType === 'servicos' && Object.keys(servicosDetails).length > 0 ? servicosDetails : null,
    });

    if (isTelecom && proposalType === 'energia') {
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

    if (!isTelecom && selectedProducts.length > 0) {
      await updateProposalProducts.mutateAsync({
        proposalId: proposal.id,
        products: selectedProducts.map(p => ({
          product_id: p.product_id,
          quantity: p.quantity,
          unit_price: p.unit_price,
          total: getProductTotal(p),
        })),
      });
    }

    onOpenChange(false);
    onSuccess?.();
  };

  const isSubmitting = updateProposal.isPending || updateProposalCpes.isPending || updateProposalProducts.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pr-14 py-4 border-b border-border/50 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Editar Proposta {proposal.code}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-6xl mx-auto p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* LEFT COLUMN (60%) */}
                <div className="lg:col-span-3 space-y-4">
                  {/* Info Básica */}
                  <Card>
                    <CardHeader className="pb-2 p-4">
                      <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <User className="h-4 w-4" />
                        Informação Básica
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-4">
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </CardContent>
                  </Card>

                  {/* Tipo de Negociação - Apenas Telecom */}
                  {isTelecom && (
                    <Card>
                      <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tipo de Negociação</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
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
                      </CardContent>
                    </Card>
                  )}

                  {/* Tipo de Proposta - Apenas Telecom */}
                  {isTelecom && (
                    <Card>
                      <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tipo de Proposta</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
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
                      </CardContent>
                    </Card>
                  )}

                  {/* CPE Selector para propostas de Energia - Apenas Telecom */}
                  {isTelecom && proposalType === 'energia' && (
                    <Card>
                      <CardContent className="p-4">
                        <ProposalCpeSelector
                          clientId={selectedClientId}
                          cpes={proposalCpes}
                          onCpesChange={setProposalCpes}
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Campos específicos de Serviços - Apenas Telecom */}
                  {isTelecom && proposalType === 'servicos' && (
                    <Card>
                      <CardContent className="p-4">
                        <div className="space-y-4 p-4 rounded-lg border bg-secondary/30 border-border">
                          <div className="flex items-center gap-2 text-foreground">
                            <Wrench className="h-4 w-4" />
                            <span className="font-medium text-sm">Outros Serviços</span>
                          </div>

                          {/* Modelo de Serviço PRIMEIRO */}
                          <div className="space-y-2">
                            <Label className="text-xs">Modelo de Serviço</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                type="button"
                                variant={modeloServico === 'transacional' ? 'default' : 'outline'}
                                size="sm"
                                className="h-9"
                                onClick={() => setModeloServico('transacional')}
                              >
                                Transacional
                              </Button>
                              <Button
                                type="button"
                                variant={modeloServico === 'saas' ? 'default' : 'outline'}
                                size="sm"
                                className="h-9"
                                onClick={() => setModeloServico('saas')}
                              >
                                SAAS
                              </Button>
                            </div>
                          </div>

                          {/* Produtos em linha */}
                          <div className="space-y-3">
                            <Label className="text-xs">Produtos</Label>
                            {SERVICOS_PRODUCT_CONFIGS.map((config) => {
                              const isActive = servicosProdutos.includes(config.name);
                              const detail = servicosDetails[config.name] || {};
                              return (
                                <div key={config.name} className="space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`edit-produto-${config.name}`}
                                      checked={isActive}
                                      onCheckedChange={(checked) => handleServicosProdutoToggle(config.name, !!checked)}
                                    />
                                    <Label htmlFor={`edit-produto-${config.name}`} className="text-sm cursor-pointer font-medium">
                                      {config.name}
                                    </Label>
                                  </div>
                                  {isActive && (
                                    <div className="ml-6 flex flex-wrap gap-2">
                                      {config.fields.map((field) => (
                                        <div key={field} className="space-y-1 min-w-[100px] flex-1">
                                          <Label className="text-xs text-muted-foreground">{FIELD_LABELS[field]}</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={detail[field] ?? ''}
                                            onChange={(e) => handleUpdateProductDetail(config.name, field, e.target.value ? parseFloat(e.target.value) : undefined)}
                                            placeholder={field === 'kwp' && config.kwpAuto ? 'Auto' : '0'}
                                            className="h-8"
                                            readOnly={field === 'kwp' && !!config.kwpAuto && detail.valor !== undefined}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* kWp Total + Comissão Total */}
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">kWp Total</Label>
                              <div className="h-8 flex items-center text-sm font-medium px-3 rounded-md bg-muted">
                                {totalKwp ? totalKwp.toLocaleString('pt-PT', { maximumFractionDigits: 2 }) : '—'}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Comissão Total (€)</Label>
                              <div className="h-8 flex items-center text-sm font-medium px-3 rounded-md bg-muted">
                                {totalComissao ? totalComissao.toLocaleString('pt-PT', { maximumFractionDigits: 2 }) : '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Campos para nichos NÃO-telecom */}
                  {!isTelecom && (
                    <Card>
                      <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                          <Package className="h-4 w-4" />
                          Produtos/Serviços
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        {products.length > 0 && (
                          <>
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
                              <div className="space-y-3">
                                {selectedProducts.map((item) => {
                                  const subtotal = item.quantity * item.unit_price;
                                  const discountedTotal = getProductTotal(item);
                                  const hasDiscount = item.discount_value > 0;
                                  
                                  return (
                                    <div key={item.product_id} className="p-3 rounded-lg bg-muted space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
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
                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Quantidade</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleUpdateProductQuantity(item.product_id, parseInt(e.target.value) || 0)}
                                            className="h-8"
                                          />
                                        </div>
                                        <div>
                                          <Label className="text-xs text-muted-foreground">Preço Unit.</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            value={item.unit_price}
                                            onChange={(e) => handleUpdateProductPrice(item.product_id, parseFloat(e.target.value) || 0)}
                                            className="h-8"
                                          />
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-end gap-2">
                                        <div className="flex-1">
                                          <Label className="text-xs text-muted-foreground">Desconto</Label>
                                          <div className="flex gap-1">
                                            <Button
                                              type="button"
                                              variant={item.discount_type === 'percentage' ? 'default' : 'outline'}
                                              size="sm"
                                              className="h-8 w-10 p-0"
                                              onClick={() => handleUpdateProductDiscount(item.product_id, 'percentage', item.discount_value)}
                                            >
                                              %
                                            </Button>
                                            <Button
                                              type="button"
                                              variant={item.discount_type === 'fixed' ? 'default' : 'outline'}
                                              size="sm"
                                              className="h-8 w-10 p-0"
                                              onClick={() => handleUpdateProductDiscount(item.product_id, 'fixed', item.discount_value)}
                                            >
                                              €
                                            </Button>
                                            <Input
                                              type="number"
                                              step="0.01"
                                              min="0"
                                              value={item.discount_value || ''}
                                              onChange={(e) => handleUpdateProductDiscount(
                                                item.product_id, 
                                                item.discount_type, 
                                                parseFloat(e.target.value) || 0
                                              )}
                                              className="h-8 flex-1"
                                              placeholder="0"
                                            />
                                          </div>
                                        </div>
                                        <div className="text-right min-w-[70px]">
                                          <Label className="text-xs text-muted-foreground">Subtotal</Label>
                                          <div className="text-sm font-medium">
                                            {hasDiscount && (
                                              <span className="text-xs text-muted-foreground line-through mr-1">
                                                {formatCurrency(subtotal)}
                                              </span>
                                            )}
                                            <span className={hasDiscount ? 'text-green-600' : ''}>
                                              {formatCurrency(discountedTotal)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Observações */}
                  <Card>
                    <CardHeader className="pb-2 p-4">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Observações da Negociação</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Detalhes da negociação, condições especiais, etc..."
                        rows={3}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* RIGHT COLUMN (40%) - Sticky */}
                <div className="lg:col-span-2">
                  <div className="lg:sticky lg:top-6 space-y-4">
                    {/* Resumo */}
                    <Card>
                      <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-4 w-4" />
                          Resumo
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3">
                        {isTelecom && proposalType === 'energia' && proposalCpes.length > 0 && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">CPE/CUI adicionados</span>
                              <span className="font-medium">{proposalCpes.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Comissão Total</span>
                              <span className="font-medium">{formatCurrency(totalComissao)}</span>
                            </div>
                            <Separator />
                          </>
                        )}

                        {!isTelecom && selectedProducts.length > 0 && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Produtos</span>
                              <span className="font-medium">{selectedProducts.length}</span>
                            </div>
                            <Separator />
                          </>
                        )}

                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                          <p className="text-sm text-muted-foreground mb-1">Total da Proposta</p>
                          <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
                          {isTelecom && proposalType === 'energia' && proposalCpes.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Soma das margens de {proposalCpes.length} CPE(s)
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="p-4 border-t border-border/50 shrink-0">
            <div className="flex gap-3 max-w-6xl mx-auto">
              <Button
                variant="senvia"
                className="flex-1"
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    A guardar...
                  </>
                ) : (
                  "Guardar Alterações"
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                size="lg"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
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
