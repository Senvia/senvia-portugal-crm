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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableCombobox, type ComboboxOption } from "@/components/ui/searchable-combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useClients } from "@/hooks/useClients";
import { useProducts } from "@/hooks/useProducts";
import { useUpdateSale } from "@/hooks/useSales";
import { useSaleItems, useCreateSaleItems, useUpdateSaleItem, useDeleteSaleItem } from "@/hooks/useSaleItems";
import { useCreateSalePayment } from "@/hooks/useSalePayments";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ClientFiscalCard, VatBadge, useVatCalculation, isInvoiceXpressActive, getOrgTaxValue } from "./SaleFiscalInfo";
import { supabase } from "@/integrations/supabase/client";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import { 
  Loader2, 
  CalendarIcon, 
  Plus, 
  Minus, 
  X, 
  Package, 
  User,
  FileText,
  AlertCircle,
  RefreshCw
} from "lucide-react";

import type { SaleWithDetails } from "@/types/sales";
import { SalePaymentsList } from "./SalePaymentsList";

interface SaleItemDraft {
  id: string;
  originalId?: string; // ID original se for item existente
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  first_due_date?: Date | null; // Data de vencimento para produtos recorrentes
  isNew?: boolean;
  isModified?: boolean;
}

interface EditSaleModalProps {
  sale: SaleWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditSaleModal({ 
  sale, 
  open, 
  onOpenChange, 
  onSuccess
}: EditSaleModalProps) {
  const { data: clients } = useClients();
  const { data: products } = useProducts();
  const { data: existingItems = [] } = useSaleItems(sale?.id);
  
  const updateSale = useUpdateSale();
  const createSaleItems = useCreateSaleItems();
  const updateSaleItem = useUpdateSaleItem();
  const deleteSaleItem = useDeleteSaleItem();
  const createSalePayment = useCreateSalePayment();

  const { organization } = useAuth();
  
  // Fiscal info
  const ixActive = isInvoiceXpressActive(organization);
  const orgTaxValue = getOrgTaxValue(organization);
  
  // Form state
  const [clientId, setClientId] = useState<string>("");
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [items, setItems] = useState<SaleItemDraft[]>([]);
  const [originalItemIds, setOriginalItemIds] = useState<string[]>([]);
  const [discount, setDiscount] = useState<string>("0");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Initialize form with sale data
  useEffect(() => {
    if (open && sale) {
      setClientId(sale.client_id || "");
      setSaleDate(sale.sale_date ? parseISO(sale.sale_date) : new Date());
      setDiscount(sale.discount?.toString() || "0");
      setNotes(sale.notes || "");
    }
  }, [open, sale]);

  // Initialize items when existingItems load
  useEffect(() => {
    if (open && existingItems.length > 0) {
      const draftItems: SaleItemDraft[] = existingItems.map(item => ({
        id: crypto.randomUUID(),
        originalId: item.id,
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        first_due_date: (item as any).first_due_date ? new Date((item as any).first_due_date) : null,
        isNew: false,
        isModified: false,
      }));
      setItems(draftItems);
      setOriginalItemIds(existingItems.map(i => i.id));
    } else if (open && existingItems.length === 0) {
      setItems([]);
      setOriginalItemIds([]);
    }
  }, [open, existingItems]);


  // Check if sale can be fully edited
  const canFullEdit = sale?.status !== 'delivered' && sale?.status !== 'cancelled';

  // Client options
  const clientOptions: ComboboxOption[] = useMemo(() => {
    if (!clients) return [];
    return clients.map(c => ({
      value: c.id,
      label: c.name,
      subtitle: c.code || c.email || undefined,
    }));
  }, [clients]);

  // Product options
  const productOptions: ComboboxOption[] = useMemo(() => {
    if (!products) return [];
    const existingProductIds = items.map(i => i.product_id).filter(Boolean);
    return products
      .filter(p => p.is_active && !existingProductIds.includes(p.id))
      .map(p => ({
        value: p.id,
        label: p.name,
        subtitle: p.price ? formatCurrency(p.price) : undefined,
      }));
  }, [products, items]);

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
  const handleAddProduct = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (!product) return;

    const existing = items.find(i => i.product_id === productId);
    if (existing) {
      setItems(items.map(i => 
        i.product_id === productId 
          ? { ...i, quantity: i.quantity + 1, isModified: !i.isNew }
          : i
      ));
    } else {
      setItems([...items, {
        id: crypto.randomUUID(),
        product_id: product.id,
        name: product.name,
        quantity: 1,
        unit_price: product.price || 0,
        isNew: true,
      }]);
    }
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setItems(items.map(i => {
      if (i.id === itemId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty, isModified: !i.isNew };
      }
      return i;
    }));
  };

  const handleUpdatePrice = (itemId: string, price: string) => {
    setItems(items.map(i => {
      if (i.id === itemId) {
        return { ...i, unit_price: parseFloat(price) || 0, isModified: !i.isNew };
      }
      return i;
    }));
  };

  const handleUpdateName = (itemId: string, name: string) => {
    setItems(items.map(i => {
      if (i.id === itemId) {
        return { ...i, name, isModified: !i.isNew };
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
        ? { ...i, first_due_date: date || null, isModified: !i.isNew }
        : i
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;
    
    setIsSubmitting(true);

    try {
      // 1. Update the sale record (pagamentos são geridos separadamente via SalePaymentsList)
      await updateSale.mutateAsync({
        saleId: sale.id,
        updates: {
          client_id: clientId || null,
          sale_date: format(saleDate, 'yyyy-MM-dd'),
          total_value: total,
          subtotal: subtotal,
          discount: discountValue,
          notes: notes.trim() || null,
        },
      });

      // 2. Handle sale items changes
      const currentItemOriginalIds = items
        .filter(i => i.originalId)
        .map(i => i.originalId!);
      
      // Items to delete (original items not in current items)
      const itemsToDelete = originalItemIds.filter(
        id => !currentItemOriginalIds.includes(id)
      );
      
      // Items to update (existing items that were modified)
      const itemsToUpdate = items.filter(i => i.originalId && i.isModified);
      
      // Items to create (new items)
      const itemsToCreate = items.filter(i => i.isNew);

      // Execute deletions
      await Promise.all(
        itemsToDelete.map(id => 
          deleteSaleItem.mutateAsync({ itemId: id, saleId: sale.id })
        )
      );

      // Execute updates
      await Promise.all(
        itemsToUpdate.map(item => 
          updateSaleItem.mutateAsync({
            itemId: item.originalId!,
            saleId: sale.id,
            updates: {
              name: item.name,
              quantity: item.quantity,
              unit_price: item.unit_price,
              total: item.quantity * item.unit_price,
              first_due_date: item.first_due_date 
                ? format(item.first_due_date, 'yyyy-MM-dd') 
                : null,
            },
          })
        )
      );

      // Execute creates
      if (itemsToCreate.length > 0) {
        await createSaleItems.mutateAsync(
          itemsToCreate.map(item => ({
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
        
        // Create automatic payments for new recurring items with due date
        // Only if sale is delivered (completed)
        if (organization && sale.status === 'delivered') {
          const recurringNewItemsWithDate = itemsToCreate.filter(item => {
            if (!item.product_id) return false;
            const product = products?.find(p => p.id === item.product_id);
            return product?.is_recurring && item.first_due_date;
          });
          
          for (const item of recurringNewItemsWithDate) {
            await createSalePayment.mutateAsync({
              sale_id: sale.id,
              organization_id: organization.id,
              amount: item.quantity * item.unit_price,
              payment_date: format(item.first_due_date!, 'yyyy-MM-dd'),
              status: 'pending',
              notes: `Mensalidade: ${item.name}`,
            });
          }
        }
      }

      // Sync payments for existing recurring items with first_due_date
      // Only if sale is delivered (completed)
      if (organization && sale.status === 'delivered') {
        for (const item of items) {
          // Only process existing items (not new ones)
          if (item.originalId && !item.isNew) {
            const product = products?.find(p => p.id === item.product_id);
            if (product?.is_recurring && item.first_due_date) {
              const paymentDateStr = format(item.first_due_date, 'yyyy-MM-dd');
              
              // Check if payment already exists for this date
              const { data: existingPayments } = await supabase
                .from('sale_payments')
                .select('id')
                .eq('sale_id', sale.id)
                .eq('payment_date', paymentDateStr)
                .eq('status', 'pending');
              
              // If no payment exists, create one
              if (!existingPayments || existingPayments.length === 0) {
                await createSalePayment.mutateAsync({
                  sale_id: sale.id,
                  organization_id: organization.id,
                  amount: item.quantity * item.unit_price,
                  payment_date: paymentDateStr,
                  status: 'pending',
                  notes: `Mensalidade: ${item.name}`,
                });
              }
            }
          }
        }
      }

      toast.success("Venda atualizada com sucesso!");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating sale:", error);
      toast.error("Erro ao atualizar venda");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="pl-6 pr-14 py-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2">
            Editar Venda
            {sale.code && (
              <Badge variant="outline" className="font-mono text-xs">
                {sale.code}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-6 space-y-6">
              {/* Client & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Cliente
                  </Label>
                  <SearchableCombobox
                    options={clientOptions}
                    value={clientId}
                    onValueChange={setClientId}
                    placeholder="Selecionar cliente..."
                    searchPlaceholder="Pesquisar cliente..."
                    emptyText="Nenhum cliente encontrado"
                    disabled={!canFullEdit}
                  />
                </div>

                {/* Client Fiscal Card */}
                {clientId && (
                  <div className="col-span-2">
                    <ClientFiscalCard client={selectedClient} isInvoiceXpressActive={ixActive} />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    Data da Venda
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !saleDate && "text-muted-foreground"
                        )}
                        disabled={!canFullEdit}
                      >
                        {saleDate ? format(saleDate, "PPP", { locale: pt }) : "Selecionar..."}
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

              {/* Proposal info (read-only) */}
              {sale.proposal && (
                <>
                  <div className="p-3 rounded-lg bg-muted/30 border">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Proposta associada:</span>
                      {sale.proposal.code && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {sale.proposal.code}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Products/Services */}
              {canFullEdit && (
                <>
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      Produtos/Serviços
                    </Label>

                    {/* Items List */}
                    {items.length > 0 && (
                      <div className="space-y-2">
                        {items.map((item) => {
                          const product = products?.find(p => p.id === item.product_id);
                          const isRecurring = product?.is_recurring;
                          
                          return (
                            <div
                              key={item.id}
                              className="p-3 rounded-lg border bg-card space-y-2"
                            >
                              {/* Linha principal do produto */}
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Input
                                      value={item.name}
                                      onChange={(e) => handleUpdateName(item.id, e.target.value)}
                                      className="h-8 text-sm font-medium"
                                    />
                                    {ixActive && <VatBadge taxValue={vatCalc.getItemTaxRate(item.product_id)} />}
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleUpdateQuantity(item.id, -1)}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-6 text-center text-sm">{item.quantity}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleUpdateQuantity(item.id, 1)}
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>

                                <div className="w-24">
                                  <Input
                                    type="number"
                                    value={item.unit_price}
                                    onChange={(e) => handleUpdatePrice(item.id, e.target.value)}
                                    className="h-8 text-sm text-right"
                                    step="0.01"
                                    min="0"
                                  />
                                </div>

                                <div className="w-20 text-right text-sm font-medium">
                                  {formatCurrency(item.quantity * item.unit_price)}
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
                                <div className="flex items-center gap-2 pl-2 text-sm border-t pt-2 mt-2">
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
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Mensal
                                  </Badge>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add Product */}
                    <SearchableCombobox
                      options={productOptions}
                      value=""
                      onValueChange={handleAddProduct}
                      placeholder="+ Adicionar produto..."
                      searchPlaceholder="Pesquisar produto..."
                      emptyText="Nenhum produto encontrado"
                    />
                  </div>
                  <Separator />
                </>
              )}

              {/* Payment Section - New Multi-Payment Component */}
              {organization && (
                <SalePaymentsList
                  saleId={sale.id}
                  organizationId={organization.id}
                  saleTotal={total}
                  readonly={!canFullEdit && sale.status === 'cancelled'}
                />
              )}

              <Separator />

              {/* Summary */}
              {canFullEdit && (
                <>
                  <div className="space-y-3 p-4 rounded-lg bg-muted/30">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-4">
                      <Label className="text-sm text-muted-foreground">Desconto</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">€</span>
                        <Input
                          type="number"
                          value={discount}
                          onChange={(e) => setDiscount(e.target.value)}
                          className="w-24 h-8 text-right"
                          step="0.01"
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <Separator />

                    {ixActive && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">IVA</span>
                        <span className="font-medium">{formatCurrency(vatCalc.totalVat)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-lg font-semibold">
                      <span>{ixActive ? 'Total (s/ IVA)' : 'Total'}</span>
                      <span className="text-primary">{formatCurrency(total)}</span>
                    </div>

                    {ixActive && (
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-muted-foreground font-medium">Total c/ IVA</span>
                        <span className="font-semibold">{formatCurrency(vatCalc.totalWithVat)}</span>
                      </div>
                    )}
                  </div>
                  <Separator />
                </>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  placeholder="Observações sobre a venda..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="p-4 border-t border-border/50 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A guardar...
                </>
              ) : (
                "Guardar Alterações"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
