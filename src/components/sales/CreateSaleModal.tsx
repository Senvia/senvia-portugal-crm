import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableCombobox, type ComboboxOption } from "@/components/ui/searchable-combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
// Lead removido - vendas são apenas para clientes
import { useProposals, useProposalProducts } from "@/hooks/useProposals";
import { useProposalCpes } from "@/hooks/useProposalCpes";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useCreateSale } from "@/hooks/useSales";
import { useCreateSaleItems } from "@/hooks/useSaleItems";
import { useCreateCpe, useUpdateCpe } from "@/hooks/useCpes";
import { useFinalStages } from "@/hooks/usePipelineStages";
import { useUpdateLeadStatus } from "@/hooks/useLeads";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  Loader2, 
  CalendarIcon, 
  Plus, 
  Minus, 
  X, 
  Package, 
  User,
  FileText,
  CreditCard,
  Receipt,
  Router,
  Zap
} from "lucide-react";
import type { Proposal } from "@/types/proposals";
import { 
  PAYMENT_METHODS, 
  PAYMENT_METHOD_LABELS, 
  PAYMENT_STATUSES, 
  PAYMENT_STATUS_LABELS,
  type PaymentMethod,
  type PaymentStatus,
  type ProposalType,
  type ModeloServico
} from "@/types/sales";

const PROPOSAL_TYPE_LABELS: Record<ProposalType, string> = {
  energia: 'Energia',
  servicos: 'Serviços',
};

const MODELO_SERVICO_LABELS: Record<ModeloServico, string> = {
  transacional: 'Transacional',
  saas: 'SAAS',
};

interface SaleItemDraft {
  id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
}

interface CreateSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillProposal?: Proposal | null;
  prefillClientId?: string | null;
  onSaleCreated?: () => void;
}

export function CreateSaleModal({ 
  open, 
  onOpenChange, 
  prefillProposal,
  prefillClientId,
  onSaleCreated
}: CreateSaleModalProps) {
  // Lead removido - vendas são apenas para clientes
  const { data: proposals } = useProposals();
  const { data: clients } = useClients();
  const { data: products } = useProducts();
  const createSale = useCreateSale();
  const createSaleItems = useCreateSaleItems();
  const createCpe = useCreateCpe();
  const updateCpe = useUpdateCpe();
  const { finalPositiveStage } = useFinalStages();
  const updateLeadStatus = useUpdateLeadStatus();
  
  // State para proposta selecionada manualmente (para buscar produtos)
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  
  // Gate queries by modal open state - ensures fresh data when modal opens
  const effectiveProposalId = open ? (prefillProposal?.id || selectedProposalId || undefined) : undefined;
  
  // Fetch proposal products - usa prefill OU seleção manual, gated by open
  const { data: proposalProducts } = useProposalProducts(effectiveProposalId);
  
  // Fetch proposal CPEs - usa prefill OU seleção manual, gated by open
  const { data: proposalCpes = [] } = useProposalCpes(effectiveProposalId);

  // Form state
  const [clientId, setClientId] = useState<string>("");
  const [proposalId, setProposalId] = useState<string>("");
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [items, setItems] = useState<SaleItemDraft[]>([]);
  const [discount, setDiscount] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [invoiceReference, setInvoiceReference] = useState("");
  const [notes, setNotes] = useState("");
  
  // Track which proposal we've already initialized items for
  const [initializedProposalId, setInitializedProposalId] = useState<string | null>(null);
  
  // Campos específicos de proposta (Energia / Serviços)
  const [proposalType, setProposalType] = useState<ProposalType | null>(null);
  const [consumoAnual, setConsumoAnual] = useState<string>("");
  const [margem, setMargem] = useState<string>("");
  const [dbl, setDbl] = useState<string>("");
  const [anosContrato, setAnosContrato] = useState<string>("");
  const [modeloServico, setModeloServico] = useState<ModeloServico | null>(null);
  const [kwp, setKwp] = useState<string>("");
  const [comissao, setComissao] = useState<string>("");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      // Reset initialization tracker
      setInitializedProposalId(null);
      
      // If prefillProposal is provided, pre-populate fields
      if (prefillProposal) {
        setProposalId(prefillProposal.id);
        setSelectedProposalId(null); // Não precisa, já vem do prefill
        
        // Find client by client_id or lead_id (retrocompatibilidade)
        if (prefillProposal.client_id) {
          setClientId(prefillProposal.client_id);
        } else if (prefillProposal.lead_id) {
          const client = clients?.find(c => c.lead_id === prefillProposal.lead_id);
          if (client) {
            setClientId(client.id);
          }
        }
        
        // Preencher notas da proposta
        if (prefillProposal.notes) {
          setNotes(prefillProposal.notes);
        }
        
        // Preencher campos específicos de Energia/Serviços
        setProposalType(prefillProposal.proposal_type || null);
        setConsumoAnual(prefillProposal.consumo_anual?.toString() || "");
        setMargem(prefillProposal.margem?.toString() || "");
        setDbl(prefillProposal.dbl?.toString() || "");
        setAnosContrato(prefillProposal.anos_contrato?.toString() || "");
        setModeloServico(prefillProposal.modelo_servico || null);
        setKwp(prefillProposal.kwp?.toString() || "");
        setComissao(prefillProposal.comissao?.toString() || "");
      } else if (prefillClientId) {
        setClientId(prefillClientId);
        setSelectedProposalId(null);
        // Reset campos específicos
        setProposalType(null);
        setConsumoAnual("");
        setMargem("");
        setDbl("");
        setAnosContrato("");
        setModeloServico(null);
        setKwp("");
        setComissao("");
      } else {
        setClientId("");
        setProposalId("");
        setSelectedProposalId(null);
        // Reset campos específicos
        setProposalType(null);
        setConsumoAnual("");
        setMargem("");
        setDbl("");
        setAnosContrato("");
        setModeloServico(null);
        setKwp("");
        setComissao("");
      }
      
      setSaleDate(new Date());
      setItems([]);
      setDiscount("0");
      setPaymentMethod("");
      setPaymentStatus("pending");
      setDueDate(undefined);
      setInvoiceReference("");
      if (!prefillProposal?.notes) {
        setNotes("");
      }
    } else {
      // Reset when modal closes
      setInitializedProposalId(null);
    }
  }, [open, prefillProposal, prefillClientId, clients]);

  // Load proposal products/value when available (prefill ou seleção manual)
  // This runs AFTER the reset effect and only when we have new data
  useEffect(() => {
    if (!open) return;
    
    const currentProposalId = prefillProposal?.id || selectedProposalId;
    
    // Skip if already initialized for this proposal
    if (currentProposalId && initializedProposalId === currentProposalId) {
      return;
    }
    
    // Se há produtos da proposta, usar esses
    if (proposalProducts && proposalProducts.length > 0) {
      const newItems: SaleItemDraft[] = proposalProducts.map(pp => ({
        id: crypto.randomUUID(),
        product_id: pp.product_id,
        name: pp.product?.name || "Produto",
        quantity: pp.quantity,
        unit_price: pp.unit_price,
      }));
      setItems(newItems);
      if (currentProposalId) {
        setInitializedProposalId(currentProposalId);
      }
    } 
    // Se não há produtos mas há um prefillProposal com valor, criar item genérico
    else if (prefillProposal && prefillProposal.total_value > 0 && proposalProducts !== undefined) {
      // proposalProducts !== undefined garante que a query já carregou (não está loading)
      const itemName = prefillProposal.proposal_type === 'energia' 
        ? 'Contrato de Energia' 
        : prefillProposal.proposal_type === 'servicos'
          ? 'Serviços'
          : 'Proposta ' + (prefillProposal.code || '');
      
      setItems([{
        id: crypto.randomUUID(),
        product_id: null,
        name: itemName,
        quantity: 1,
        unit_price: prefillProposal.total_value,
      }]);
      setInitializedProposalId(prefillProposal.id);
    }
    // Para seleção manual de proposta (sem prefill), criar item genérico se não há produtos
    else if (selectedProposalId && proposalProducts !== undefined && proposalProducts.length === 0) {
      const selectedProposal = proposals?.find(p => p.id === selectedProposalId);
      if (selectedProposal && selectedProposal.total_value > 0) {
        const itemName = selectedProposal.proposal_type === 'energia' 
          ? 'Contrato de Energia' 
          : selectedProposal.proposal_type === 'servicos'
            ? 'Serviços'
            : 'Proposta ' + (selectedProposal.code || '');
        
        setItems([{
          id: crypto.randomUUID(),
          product_id: null,
          name: itemName,
          quantity: 1,
          unit_price: selectedProposal.total_value,
        }]);
        setInitializedProposalId(selectedProposalId);
      }
    }
  }, [open, proposalProducts, prefillProposal, selectedProposalId, initializedProposalId, proposals]);

  // Filter proposals based on selected client - show all except rejected
  const filteredProposals = useMemo(() => {
    if (!proposals) return [];
    
    // Mostrar todas as propostas exceto as rejeitadas
    let filtered = proposals.filter(p => p.status !== 'rejected');
    
    // Sempre incluir a proposta pré-selecionada
    if (prefillProposal && !filtered.find(p => p.id === prefillProposal.id)) {
      filtered = [prefillProposal, ...filtered];
    }
    
    if (clientId) {
      // Filtrar por client_id ou pelo lead associado ao cliente (retrocompatibilidade)
      const client = clients?.find(c => c.id === clientId);
      filtered = filtered.filter(p => 
        p.client_id === clientId || (client?.lead_id && p.lead_id === client.lead_id) ||
        p.id === prefillProposal?.id // Manter a proposta pré-selecionada visível
      );
    }
    
    return filtered;
  }, [proposals, clients, clientId, prefillProposal]);

  // Helper to get proposal status label
  const getProposalStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted': return 'Aceite';
      case 'sent': return 'Enviada';
      case 'pending': return 'Pendente';
      default: return 'Rascunho';
    }
  };

  // Calculate totals
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  }, [items]);

  const discountValue = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountValue);

  // Handlers
  const handleClientSelect = (value: string) => {
    if (value === "none") {
      setClientId("");
      return;
    }
    setClientId(value);
    // Clear proposal if it doesn't match the new client
    if (proposalId) {
      const proposal = proposals?.find(p => p.id === proposalId);
      const client = clients?.find(c => c.id === value);
      // Verifica se a proposta pertence ao cliente (por client_id ou lead_id)
      if (proposal && proposal.client_id !== value && proposal.lead_id !== client?.lead_id) {
        setProposalId("");
      }
    }
  };

  const handleProposalSelect = (value: string) => {
    if (value === "none") {
      setProposalId("");
      setSelectedProposalId(null);
      setItems([]); // Limpar produtos
      setNotes(""); // Limpar notas
      return;
    }
    
    setProposalId(value);
    setSelectedProposalId(value); // Trigger para buscar produtos
    
    // Encontrar a proposta e preencher dados
    const proposal = proposals?.find(p => p.id === value);
    if (proposal) {
      // Preencher cliente se não estiver preenchido
      if (!clientId) {
        if (proposal.client_id) {
          setClientId(proposal.client_id);
        } else if (proposal.lead_id) {
          const client = clients?.find(c => c.lead_id === proposal.lead_id);
          if (client) {
            setClientId(client.id);
          }
        }
      }
      
      // Preencher notas da proposta
      if (proposal.notes) {
        setNotes(proposal.notes);
      }
      
      // Preencher campos específicos de Energia/Serviços
      setProposalType(proposal.proposal_type || null);
      setConsumoAnual(proposal.consumo_anual?.toString() || "");
      setMargem(proposal.margem?.toString() || "");
      setDbl(proposal.dbl?.toString() || "");
      setAnosContrato(proposal.anos_contrato?.toString() || "");
      setModeloServico(proposal.modelo_servico || null);
      setKwp(proposal.kwp?.toString() || "");
      setComissao(proposal.comissao?.toString() || "");
      
      // Limpar items para serem recarregados pelo useEffect de proposalProducts
      setItems([]);
    }
  };

  const handleAddProduct = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    // Check if already added
    const existing = items.find(i => i.product_id === productId);
    if (existing) {
      setItems(items.map(i => 
        i.product_id === productId 
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setItems([...items, {
        id: crypto.randomUUID(),
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.price || 0,
      }]);
    }
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setItems(items.map(i => {
      if (i.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const handleUpdatePrice = (itemId: string, price: string) => {
    setItems(items.map(i => {
      if (i.id === itemId) {
        return { ...i, unit_price: parseFloat(price) || 0 };
      }
      return i;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (total <= 0 && items.length === 0) return;

    try {
      // Calculate recurring value from items with recurring products
      const recurringItems = items.filter(item => {
        if (!item.product_id) return false;
        const product = products?.find(p => p.id === item.product_id);
        return product?.is_recurring;
      });
      
      const recurringValue = recurringItems.reduce(
        (sum, item) => sum + (item.quantity * item.unit_price), 0
      );
      const hasRecurring = recurringValue > 0;
      const nextRenewalDate = hasRecurring 
        ? addMonths(saleDate, 1).toISOString().split('T')[0] 
        : undefined;

      const sale = await createSale.mutateAsync({
        client_id: clientId || undefined,
        proposal_id: proposalId || undefined,
        total_value: total,
        subtotal: subtotal,
        discount: discountValue,
        payment_method: paymentMethod || undefined,
        payment_status: paymentStatus,
        due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
        invoice_reference: invoiceReference.trim() || undefined,
        sale_date: format(saleDate, 'yyyy-MM-dd'),
        notes: notes.trim() || undefined,
        // Campos específicos de proposta
        proposal_type: proposalType || undefined,
        consumo_anual: parseFloat(consumoAnual) || undefined,
        margem: parseFloat(margem) || undefined,
        dbl: parseFloat(dbl) || undefined,
        anos_contrato: parseInt(anosContrato) || undefined,
        modelo_servico: modeloServico || undefined,
        kwp: parseFloat(kwp) || undefined,
        comissao: parseFloat(comissao) || undefined,
        // Campos de recorrência
        has_recurring: hasRecurring,
        recurring_value: recurringValue,
        recurring_status: hasRecurring ? 'active' : undefined,
        next_renewal_date: nextRenewalDate,
      });

      // Create sale items
      if (items.length > 0 && sale?.id) {
        await createSaleItems.mutateAsync(
          items.map(item => ({
            sale_id: sale.id,
            product_id: item.product_id,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.quantity * item.unit_price,
          }))
        );
      }

      // Process CPEs - criar novos ou atualizar existentes
      if (proposalCpes.length > 0 && clientId) {
        for (const proposalCpe of proposalCpes) {
          if (proposalCpe.existing_cpe_id) {
            // Atualizar CPE existente (renovação)
            await updateCpe.mutateAsync({
              id: proposalCpe.existing_cpe_id,
              comercializador: proposalCpe.comercializador,
              fidelizacao_start: proposalCpe.fidelizacao_start || undefined,
              fidelizacao_end: proposalCpe.fidelizacao_end || undefined,
              notes: proposalCpe.notes || undefined,
            });
          } else {
            // Criar novo CPE
            await createCpe.mutateAsync({
              client_id: clientId,
              equipment_type: proposalCpe.equipment_type,
              comercializador: proposalCpe.comercializador,
              serial_number: proposalCpe.serial_number || undefined,
              fidelizacao_start: proposalCpe.fidelizacao_start || undefined,
              fidelizacao_end: proposalCpe.fidelizacao_end || undefined,
              notes: proposalCpe.notes || undefined,
              status: 'active',
            });
          }
        }
      }

      // Notify parent that sale was created successfully
      onSaleCreated?.();

      onOpenChange(false);
    } catch (error) {
      console.error('Error creating sale:', error);
    }
  };

  const isValid = (items.length > 0 || total > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Nova Venda
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <User className="h-4 w-4" />
                Informação Básica
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Client Select */}
                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <SearchableCombobox
                    options={(clients || []).map((client): ComboboxOption => ({
                      value: client.id,
                      label: client.name,
                      sublabel: client.code || client.email || undefined,
                    }))}
                    value={clientId || null}
                    onValueChange={(v) => handleClientSelect(v || "none")}
                    placeholder="Selecionar cliente..."
                    searchPlaceholder="Pesquisar cliente..."
                    emptyLabel="Sem cliente"
                    emptyText="Nenhum cliente encontrado."
                  />
                </div>

                {/* Proposal Select */}
                <div className="space-y-2">
                  <Label>Proposta</Label>
                <SearchableCombobox
                    options={filteredProposals.map((proposal): ComboboxOption => ({
                      value: proposal.id,
                      label: `${proposal.client?.name || proposal.lead?.name || "Proposta"} - ${formatCurrency(proposal.total_value)} (${getProposalStatusLabel(proposal.status)})`,
                      sublabel: proposal.code || undefined,
                    }))}
                    value={proposalId || null}
                    onValueChange={(v) => handleProposalSelect(v || "none")}
                    placeholder="Selecionar proposta..."
                    searchPlaceholder="Pesquisar proposta..."
                    emptyLabel="Venda direta"
                    emptyText="Nenhuma proposta encontrada."
                  />
                </div>

                {/* Sale Date */}
                <div className="space-y-2">
                  <Label>Data da Venda</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !saleDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {saleDate ? format(saleDate, "PPP", { locale: pt }) : "Selecionar data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={saleDate}
                        onSelect={(date) => date && setSaleDate(date)}
                        locale={pt}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 2: Products */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Package className="h-4 w-4" />
                  Produtos / Serviços
                </div>
              </div>

              {/* Product Selector */}
              <Select onValueChange={handleAddProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar produto ou serviço..." />
                </SelectTrigger>
                <SelectContent>
                  {products?.filter(p => p.is_active).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price || 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Items List */}
              {items.length > 0 && (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm w-8 text-center">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="text-muted-foreground text-sm">×</span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_price}
                            onChange={(e) => handleUpdatePrice(item.id, e.target.value)}
                            className="w-24 h-7 text-sm"
                          />
                          <span className="text-muted-foreground text-sm">€</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold">{formatCurrency(item.quantity * item.unit_price)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {items.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border/50 rounded-lg">
                  Adicione produtos ou serviços à venda
                </div>
              )}
            </div>

            {/* Section 2.5: CPEs from Proposal */}
            {proposalCpes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Router className="h-4 w-4" />
                    CPEs (serão criados/atualizados)
                  </div>
                  
                  <div className="space-y-2">
                    {proposalCpes.map((cpe) => (
                      <div
                        key={cpe.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{cpe.equipment_type}</span>
                              <Badge variant={cpe.existing_cpe_id ? 'secondary' : 'default'} className="text-xs">
                                {cpe.existing_cpe_id ? 'Renovação' : 'Novo'}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {cpe.comercializador}
                              {cpe.serial_number && ` • ${cpe.serial_number}`}
                              {cpe.fidelizacao_end && ` • Até ${cpe.fidelizacao_end}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Section 2.6: Dados Energia/Serviços */}
            {proposalType && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    Dados {PROPOSAL_TYPE_LABELS[proposalType]}
                  </div>
                  
                  {proposalType === 'energia' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Consumo Anual (kWh)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={consumoAnual}
                          onChange={(e) => setConsumoAnual(e.target.value)}
                          placeholder="Ex: 15000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Margem (€/MWh)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={margem}
                          onChange={(e) => setMargem(e.target.value)}
                          placeholder="Ex: 5.50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">DBL</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={dbl}
                          onChange={(e) => setDbl(e.target.value)}
                          placeholder="Ex: 2.00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Anos Contrato</Label>
                        <Input
                          type="number"
                          step="1"
                          min="1"
                          value={anosContrato}
                          onChange={(e) => setAnosContrato(e.target.value)}
                          placeholder="Ex: 2"
                        />
                      </div>
                    </div>
                  )}
                  
                  {proposalType === 'servicos' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs">Modelo Serviço</Label>
                        <Select 
                          value={modeloServico || "none"} 
                          onValueChange={(v) => setModeloServico(v === "none" ? null : v as ModeloServico)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Não definido</SelectItem>
                            <SelectItem value="transacional">{MODELO_SERVICO_LABELS.transacional}</SelectItem>
                            <SelectItem value="saas">{MODELO_SERVICO_LABELS.saas}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">kWp</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={kwp}
                          onChange={(e) => setKwp(e.target.value)}
                          placeholder="Ex: 10.5"
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Comissão - comum a ambos */}
                  <div className="max-w-[200px] space-y-2">
                    <Label className="text-xs">Comissão (€)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={comissao}
                      onChange={(e) => setComissao(e.target.value)}
                      placeholder="Ex: 150.00"
                    />
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Section 3: Totals */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FileText className="h-4 w-4" />
                Valores
              </div>

              <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Desconto</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-24 h-8 text-sm"
                    />
                    <span className="text-muted-foreground text-sm">€</span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 4: Payment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Pagamento
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Método de Pagamento</Label>
                  <Select 
                    value={paymentMethod || "none"} 
                    onValueChange={(v) => setPaymentMethod(v === "none" ? "" : v as PaymentMethod)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Não definido</SelectItem>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {PAYMENT_METHOD_LABELS[method]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estado do Pagamento</Label>
                  <Select 
                    value={paymentStatus} 
                    onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {PAYMENT_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dueDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "PPP", { locale: pt }) : "Opcional"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        locale={pt}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Referência / Fatura</Label>
                  <Input
                    placeholder="Ex: FT 2024/001"
                    value={invoiceReference}
                    onChange={(e) => setInvoiceReference(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Section 5: Notes */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Observações sobre a venda..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </form>
        </ScrollArea>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-border/50 bg-muted/30">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || createSale.isPending}
          >
            {createSale.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                A criar...
              </>
            ) : (
              "Criar Venda"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
