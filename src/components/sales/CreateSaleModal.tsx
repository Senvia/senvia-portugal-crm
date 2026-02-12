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
import { PROPOSAL_STATUS_LABELS, type ProposalStatus } from "@/types/proposals";
import { useProposalCpes } from "@/hooks/useProposalCpes";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useCreateSale } from "@/hooks/useSales";
import { useCreateSaleItems } from "@/hooks/useSaleItems";
import { useCreateSalePayment } from "@/hooks/useSalePayments";
import { useCreateCpe, useUpdateCpe } from "@/hooks/useCpes";
import { useAuth } from "@/contexts/AuthContext";
import { useFinalStages } from "@/hooks/usePipelineStages";
import { useUpdateLeadStatus } from "@/hooks/useLeads";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import { ClientFiscalCard, VatBadge, useVatCalculation, isInvoiceXpressActive, getOrgTaxValue } from "./SaleFiscalInfo";
import { pt } from "date-fns/locale";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  CalendarIcon, 
  Plus, 
  Minus, 
  X, 
  Package, 
  User,
  FileText,
  Router,
  Zap,
  CreditCard,
  Trash2
} from "lucide-react";
import type { Proposal } from "@/types/proposals";
import { NEGOTIATION_TYPE_LABELS, SERVICOS_PRODUCTS } from "@/types/proposals";
import { 
  type ProposalType,
  type ModeloServico,
  type NegotiationType,
  type PaymentMethod,
  type SaleStatus,
  PAYMENT_METHOD_LABELS,
  PAYMENT_RECORD_STATUS_LABELS,
  PAYMENT_RECORD_STATUS_COLORS,
  SALE_STATUS_LABELS,
  SALE_STATUSES,
} from "@/types/sales";
import { calculatePaymentSummary } from "@/hooks/useSalePayments";
import { AddDraftPaymentModal, type DraftPayment } from "./AddDraftPaymentModal";
import { PaymentTypeSelector } from "./PaymentTypeSelector";
import { DraftScheduleModal } from "./DraftScheduleModal";


interface SaleItemDraft {
  id: string;
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  first_due_date?: Date | null; // Data de vencimento para produtos recorrentes
}

interface CreateSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillProposal?: Proposal | null;
  prefillClientId?: string | null;
  onSaleCreated?: (saleId: string) => void;
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
  const createSalePayment = useCreateSalePayment();
  const createCpe = useCreateCpe();
  const updateCpe = useUpdateCpe();
  const { finalPositiveStage } = useFinalStages();
  const updateLeadStatus = useUpdateLeadStatus();
  const { organization } = useAuth();
  const isTelecom = organization?.niche === 'telecom';
  
  // Fiscal info
  const ixActive = isInvoiceXpressActive(organization);
  const orgTaxValue = getOrgTaxValue(organization);
  
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
  const [negotiationType, setNegotiationType] = useState<NegotiationType | null>(null);
  const [servicosProdutos, setServicosProdutos] = useState<string[]>([]);

  // Sale status
  const [saleStatus, setSaleStatus] = useState<SaleStatus>("pending");

  // Draft payments state
  const [draftPayments, setDraftPayments] = useState<DraftPayment[]>([]);
  const [showDraftPaymentModal, setShowDraftPaymentModal] = useState(false);
  const [showPaymentTypeSelector, setShowPaymentTypeSelector] = useState(false);
  const [showDraftScheduleModal, setShowDraftScheduleModal] = useState(false);

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
        setNegotiationType(prefillProposal.negotiation_type || null);
        setServicosProdutos(prefillProposal.servicos_produtos || []);
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
        setNegotiationType(null);
        setServicosProdutos([]);
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
        setNegotiationType(null);
        setServicosProdutos([]);
      }
      
      setSaleDate(new Date());
      setSaleStatus("pending");
      setItems([]);
      setDiscount("0");
      setDraftPayments([]);
      setShowDraftPaymentModal(false);
      setShowPaymentTypeSelector(false);
      setShowDraftScheduleModal(false);
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
    return PROPOSAL_STATUS_LABELS[status as ProposalStatus] || status;
  };

  // Calculate totals
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  }, [items]);

  const discountValue = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountValue);

  // VAT calculation (display only, when InvoiceXpress active)
  const vatCalc = useVatCalculation({
    items, products, orgTaxValue, discount: discountValue, subtotal,
  });

  // Selected client fiscal data
  const selectedClient = useMemo(() => {
    if (!clientId || !clients) return null;
    return clients.find(c => c.id === clientId) || null;
  }, [clientId, clients]);

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
      // Reset telecom fields
      setProposalType(null);
      setConsumoAnual("");
      setMargem("");
      setDbl("");
      setAnosContrato("");
      setModeloServico(null);
      setKwp("");
      setComissao("");
      setNegotiationType(null);
      setServicosProdutos([]);
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
      setNegotiationType(proposal.negotiation_type || null);
      setServicosProdutos(proposal.servicos_produtos || []);
      
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

  const handleUpdateDueDate = (itemId: string, date: Date | undefined) => {
    setItems(items.map(i => 
      i.id === itemId 
        ? { ...i, first_due_date: date || null }
        : i
    ));
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
        status: saleStatus,
        total_value: total,
        subtotal: subtotal,
        discount: discountValue,
        sale_date: format(saleDate, 'yyyy-MM-dd'),
        notes: notes.trim() || undefined,
        // Campos específicos de proposta (Telecom-only)
        ...(isTelecom && proposalId ? {
          proposal_type: proposalType || undefined,
          consumo_anual: parseFloat(consumoAnual) || undefined,
          margem: parseFloat(margem) || undefined,
          dbl: parseFloat(dbl) || undefined,
          anos_contrato: parseInt(anosContrato) || undefined,
          modelo_servico: modeloServico || undefined,
          kwp: parseFloat(kwp) || undefined,
          comissao: parseFloat(comissao) || undefined,
          negotiation_type: negotiationType || undefined,
          servicos_produtos: servicosProdutos.length > 0 ? servicosProdutos : undefined,
        } : {}),
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
            first_due_date: item.first_due_date 
              ? format(item.first_due_date, 'yyyy-MM-dd') 
              : null,
          }))
        );
        
        // Create automatic payments for recurring items with due date
        // Only create payments if sale status would be 'delivered' (it's 'pending' by default)
        // Payments will be created when sale status changes to 'delivered'
      }

      // Process CPEs - criar novos ou atualizar existentes
      // Quando proposta é aceite, comercializador é sempre "EDP Comercial"
      if (proposalCpes.length > 0 && clientId) {
        for (const proposalCpe of proposalCpes) {
          if (proposalCpe.existing_cpe_id) {
            // Atualizar CPE existente (renovação)
            await updateCpe.mutateAsync({
              id: proposalCpe.existing_cpe_id,
              comercializador: 'EDP Comercial', // Sempre EDP quando proposta é ganha
              fidelizacao_start: proposalCpe.contrato_inicio || proposalCpe.fidelizacao_start || undefined,
              fidelizacao_end: proposalCpe.contrato_fim || proposalCpe.fidelizacao_end || undefined,
              notes: proposalCpe.notes || undefined,
              status: 'active', // Reativar se estava inativo
            });
          } else {
            // Criar novo CPE
            await createCpe.mutateAsync({
              client_id: clientId,
              equipment_type: proposalCpe.equipment_type,
              comercializador: 'EDP Comercial', // Sempre EDP quando proposta é ganha
              serial_number: proposalCpe.serial_number || undefined,
              fidelizacao_start: proposalCpe.contrato_inicio || proposalCpe.fidelizacao_start || undefined,
              fidelizacao_end: proposalCpe.contrato_fim || proposalCpe.fidelizacao_end || undefined,
              notes: proposalCpe.notes || undefined,
              status: 'active',
            });
          }
        }
      }

      // Create draft payments (skip for telecom - no billing)
      if (!isTelecom && draftPayments.length > 0 && sale?.id && organization?.id) {
        for (const dp of draftPayments) {
          await createSalePayment.mutateAsync({
            sale_id: sale.id,
            organization_id: organization.id,
            amount: dp.amount,
            payment_date: dp.payment_date,
            payment_method: dp.payment_method,
            status: dp.status,
            invoice_reference: dp.invoice_reference,
            notes: dp.notes,
          });
        }
      }

      // Notify parent that sale was created successfully
      onSaleCreated?.(sale.id);

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
            <FileText className="h-5 w-5 text-primary" />
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

                {/* Client Fiscal Card (InvoiceXpress only) - spans full width */}
                {clientId && (
                  <div className="sm:col-span-2">
                    <ClientFiscalCard client={selectedClient} isInvoiceXpressActive={ixActive} />
                  </div>
                )}

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

                {/* Sale Status */}
                <div className="space-y-2">
                  <Label>Estado da Venda</Label>
                  <Select value={saleStatus} onValueChange={(v) => setSaleStatus(v as SaleStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SALE_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>
                          {SALE_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Telecom Data Section (read-only preview) */}
            {isTelecom && proposalId && (negotiationType || proposalType) && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Zap className="h-4 w-4 text-amber-500" />
                    Dados Telecom (da Proposta)
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                    {negotiationType && (
                      <div className="col-span-1 sm:col-span-2">
                        <p className="text-xs text-muted-foreground">Tipo de Negociação</p>
                        <p className="text-sm font-medium">
                          {NEGOTIATION_TYPE_LABELS[negotiationType] || negotiationType}
                        </p>
                      </div>
                    )}

                    {proposalType === 'servicos' && (
                      <>
                        {servicosProdutos.length > 0 && (
                          <div className="col-span-1 sm:col-span-2">
                            <p className="text-xs text-muted-foreground">Serviços/Produtos</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {servicosProdutos.map((s) => (
                                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {modeloServico && (
                          <div>
                            <p className="text-xs text-muted-foreground">Modelo de Serviço</p>
                            <p className="text-sm font-medium">
                              {modeloServico === 'transacional' ? 'Transacional' : modeloServico === 'saas' ? 'SAAS' : modeloServico}
                            </p>
                          </div>
                        )}
                        {kwp && (
                          <div>
                            <p className="text-xs text-muted-foreground">kWp</p>
                            <p className="text-sm font-medium">{kwp}</p>
                          </div>
                        )}
                        {comissao && (
                          <div>
                            <p className="text-xs text-muted-foreground">Comissão</p>
                            <p className="text-sm font-medium text-green-500">
                              {formatCurrency(parseFloat(comissao))}
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {proposalType === 'energia' && proposalCpes.length > 0 && (
                      <>
                        <div>
                          <p className="text-xs text-muted-foreground">Pontos de Consumo</p>
                          <p className="text-sm font-medium">{proposalCpes.length} CPE(s)</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Consumo Total</p>
                          <p className="text-sm font-medium">
                            {(proposalCpes.reduce((sum, c) => sum + (c.consumo_anual || 0), 0) / 1000).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} MWh
                          </p>
                        </div>
                        {(() => {
                          const totalComissao = proposalCpes.reduce((sum, c) => sum + (c.comissao || 0), 0);
                          return totalComissao > 0 ? (
                            <div>
                              <p className="text-xs text-muted-foreground">Comissão Total</p>
                              <p className="text-sm font-medium text-green-500">
                                {formatCurrency(totalComissao)}
                              </p>
                            </div>
                          ) : null;
                        })()}
                      </>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Telecom CPE/CUI Details (read-only) */}
            {isTelecom && proposalCpes.length > 0 && (
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Router className="h-4 w-4" />
                    CPE/CUI (Pontos de Consumo)
                  </div>
                  
                  <div className="space-y-2">
                    {proposalCpes.map((cpe) => (
                      <div
                        key={cpe.id}
                        className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">{cpe.equipment_type}</Badge>
                          <Badge variant="secondary" className="text-xs">{cpe.comercializador}</Badge>
                          {cpe.existing_cpe_id ? (
                            <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">Renovação</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">Novo</Badge>
                          )}
                        </div>
                        {cpe.serial_number && (
                          <div>
                            <p className="text-xs text-muted-foreground">Local de Consumo</p>
                            <p className="text-sm font-mono">{cpe.serial_number}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {cpe.consumo_anual != null && (
                            <div>
                              <p className="text-xs text-muted-foreground">Consumo Anual</p>
                              <p className="text-sm font-medium">{cpe.consumo_anual.toLocaleString('pt-PT')} kWh</p>
                            </div>
                          )}
                          {cpe.duracao_contrato != null && (
                            <div>
                              <p className="text-xs text-muted-foreground">Duração</p>
                              <p className="text-sm font-medium">{cpe.duracao_contrato} {cpe.duracao_contrato === 1 ? 'ano' : 'anos'}</p>
                            </div>
                          )}
                          {cpe.dbl != null && (
                            <div>
                              <p className="text-xs text-muted-foreground">DBL</p>
                              <p className="text-sm font-medium">{cpe.dbl.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}</p>
                            </div>
                          )}
                          {cpe.margem != null && (
                            <div>
                              <p className="text-xs text-muted-foreground">Margem</p>
                              <p className="text-sm font-medium">{cpe.margem.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €/MWh</p>
                            </div>
                          )}
                          {cpe.comissao != null && (
                            <div>
                              <p className="text-xs text-muted-foreground">Comissão</p>
                              <p className="text-sm font-medium text-green-500">{formatCurrency(cpe.comissao)}</p>
                            </div>
                          )}
                        </div>
                        {(cpe.contrato_inicio || cpe.contrato_fim) && (
                          <div>
                            <p className="text-xs text-muted-foreground">Contrato</p>
                            <p className="text-sm">
                              {cpe.contrato_inicio ? format(new Date(cpe.contrato_inicio), "dd/MM/yyyy") : '—'}
                              {' → '}
                              {cpe.contrato_fim ? format(new Date(cpe.contrato_fim), "dd/MM/yyyy") : '—'}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

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
                  {items.map((item) => {
                    const product = products?.find(p => p.id === item.product_id);
                    const isRecurring = product?.is_recurring;
                    
                    return (
                      <div 
                        key={item.id} 
                        className="p-3 rounded-lg border border-border/50 bg-muted/30 space-y-2"
                      >
                        {/* Linha principal do produto */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm truncate">{item.name}</p>
                              {ixActive && <VatBadge taxValue={vatCalc.getItemTaxRate(item.product_id)} />}
                            </div>
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
                        
                        {/* Data de vencimento para produtos recorrentes */}
                        {isRecurring && (
                          <div className="flex items-center gap-2 pl-2 text-sm border-t border-border/50 pt-2">
                            <CalendarIcon className="h-4 w-4 text-primary" />
                            <span className="text-muted-foreground">Vence em:</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button 
                                  type="button"
                                  variant="outline" 
                                  size="sm"
                                  className="h-7 text-xs"
                                >
                                  {item.first_due_date 
                                    ? format(item.first_due_date, "dd/MM/yyyy")
                                    : "Selecionar data"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={item.first_due_date || undefined}
                                  onSelect={(date) => handleUpdateDueDate(item.id, date)}
                                  locale={pt}
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <Badge variant="secondary" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              Mensal
                            </Badge>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {items.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border/50 rounded-lg">
                  Adicione produtos ou serviços à venda
                </div>
              )}
            </div>

            {/* Old CPE section removed - now handled in Telecom section above */}

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

                {ixActive && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA</span>
                    <span className="font-medium">{formatCurrency(vatCalc.totalVat)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="font-semibold">{ixActive ? 'Total (s/ IVA)' : 'Total'}</span>
                  <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
                </div>

                {ixActive && (
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground font-medium">Total c/ IVA</span>
                    <span className="font-semibold">{formatCurrency(vatCalc.totalWithVat)}</span>
                  </div>
                )}
              </div>
            </div>

            {!isTelecom && (
              <>
                <Separator />

                {/* Section 3.5: Payments */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      Pagamentos
                    </div>
                    {total > 0 && (() => {
                      const summary = calculatePaymentSummary(
                        draftPayments.map(dp => ({ ...dp, id: dp.id, organization_id: '', sale_id: '', invoice_file_url: null, created_at: '', updated_at: '' })),
                        total
                      );
                      return summary.remaining > 0;
                    })() && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPaymentTypeSelector(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar
                      </Button>
                    )}
                  </div>

                  {draftPayments.length > 0 ? (
                    <div className="space-y-2">
                      {draftPayments.map((dp) => (
                        <div
                          key={dp.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30"
                        >
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{formatCurrency(dp.amount)}</span>
                              <Badge variant="outline" className={cn("text-xs", PAYMENT_RECORD_STATUS_COLORS[dp.status])}>
                                {PAYMENT_RECORD_STATUS_LABELS[dp.status]}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {dp.payment_date}
                              {dp.payment_method && ` • ${PAYMENT_METHOD_LABELS[dp.payment_method]}`}
                              {dp.invoice_reference && ` • ${dp.invoice_reference}`}
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDraftPayments(prev => prev.filter(p => p.id !== dp.id))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}

                      {/* Payment summary */}
                      {(() => {
                        const summary = calculatePaymentSummary(
                          draftPayments.map(dp => ({ ...dp, organization_id: '', sale_id: '', invoice_file_url: null, created_at: '', updated_at: '' })),
                          total
                        );
                        return (
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Total pago</span>
                              <span className="font-medium text-green-500">{formatCurrency(summary.totalPaid)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Em falta</span>
                              <span className="font-medium">{formatCurrency(summary.remaining)}</span>
                            </div>
                            <Progress value={summary.percentage} className="h-2" />
                          </div>
                        );
                      })()}
                    </div>
                  ) : total > 0 ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-dashed"
                      onClick={() => setShowPaymentTypeSelector(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Pagamento
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Adicione produtos para registar pagamentos
                    </p>
                  )}
                </div>

                <Separator />
              </>
            )}

            {/* Section 4: Notes */}
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

        {/* Payment Type Selector */}
        <PaymentTypeSelector
          open={showPaymentTypeSelector}
          onOpenChange={setShowPaymentTypeSelector}
          remainingAmount={(() => {
            const summary = calculatePaymentSummary(
              draftPayments.map(dp => ({ ...dp, organization_id: '', sale_id: '', invoice_file_url: null, created_at: '', updated_at: '' })),
              total
            );
            return summary.remaining;
          })()}
          onSelectTotal={() => {
            setShowPaymentTypeSelector(false);
            setShowDraftPaymentModal(true);
          }}
          onSelectInstallments={() => {
            setShowPaymentTypeSelector(false);
            setShowDraftScheduleModal(true);
          }}
        />

        {/* Draft Payment Modal */}
        <AddDraftPaymentModal
          open={showDraftPaymentModal}
          onOpenChange={setShowDraftPaymentModal}
          saleTotal={total}
          remaining={(() => {
            const summary = calculatePaymentSummary(
              draftPayments.map(dp => ({ ...dp, organization_id: '', sale_id: '', invoice_file_url: null, created_at: '', updated_at: '' })),
              total
            );
            return summary.remaining;
          })()}
          onAdd={(payment) => setDraftPayments(prev => [...prev, payment])}
          hideInvoiceReference={
            (organization?.integrations_enabled as any)?.invoicexpress !== false
            && !!(organization?.invoicexpress_account_name && organization?.invoicexpress_api_key)
          }
        />

        {/* Draft Schedule Modal (Parcelado) */}
        <DraftScheduleModal
          open={showDraftScheduleModal}
          onOpenChange={setShowDraftScheduleModal}
          remainingAmount={(() => {
            const summary = calculatePaymentSummary(
              draftPayments.map(dp => ({ ...dp, organization_id: '', sale_id: '', invoice_file_url: null, created_at: '', updated_at: '' })),
              total
            );
            return summary.remaining;
          })()}
          onAdd={(payments) => setDraftPayments(prev => [...prev, ...payments])}
        />

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
