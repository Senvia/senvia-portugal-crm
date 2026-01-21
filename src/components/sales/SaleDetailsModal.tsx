import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  User, 
  Calendar, 
  FileText, 
  Trash2, 
  MessageSquare, 
  Phone,
  CreditCard,
  Receipt,
  Package
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUpdateSale, useDeleteSale } from "@/hooks/useSales";
import { useSaleItems } from "@/hooks/useSaleItems";
import { formatCurrency } from "@/lib/format";
import type { SaleWithDetails, SaleStatus, PaymentStatus } from "@/types/sales";
import { 
  SALE_STATUS_LABELS, 
  SALE_STATUS_COLORS, 
  SALE_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  type PaymentMethod
} from "@/types/sales";

interface SaleDetailsModalProps {
  sale: SaleWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailsModal({ sale, open, onOpenChange }: SaleDetailsModalProps) {
  const [status, setStatus] = useState<SaleStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("pending");
  const [notes, setNotes] = useState("");
  const [editValue, setEditValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: saleItems = [] } = useSaleItems(sale?.id);
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();

  useEffect(() => {
    if (sale) {
      setStatus(sale.status);
      setPaymentStatus((sale.payment_status as PaymentStatus) || "pending");
      setNotes(sale.notes || "");
      setEditValue(sale.total_value?.toString() || "0");
    }
  }, [sale]);

  if (!sale) return null;

  const handleStatusChange = (newStatus: SaleStatus) => {
    setStatus(newStatus);
    updateSale.mutate({ saleId: sale.id, updates: { status: newStatus } });
  };

  const handlePaymentStatusChange = (newStatus: PaymentStatus) => {
    setPaymentStatus(newStatus);
    const updates: { payment_status: PaymentStatus; paid_date?: string | null } = { 
      payment_status: newStatus 
    };
    if (newStatus === 'paid') {
      updates.paid_date = new Date().toISOString().split('T')[0];
    }
    updateSale.mutate({ saleId: sale.id, updates });
  };

  const handleNotesBlur = () => {
    if (notes !== sale.notes) {
      updateSale.mutate({ saleId: sale.id, updates: { notes } });
    }
  };

  const handleValueBlur = () => {
    const numValue = parseFloat(editValue) || 0;
    if (numValue !== sale.total_value) {
      updateSale.mutate({ saleId: sale.id, updates: { total_value: numValue } });
    }
  };

  const handleDelete = () => {
    deleteSale.mutate(sale.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onOpenChange(false);
      },
    });
  };

  const openWhatsApp = () => {
    if (sale.lead?.phone) {
      const phone = sale.lead.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}`, "_blank");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0">
          <DialogHeader className="pl-6 pr-14 py-4 border-b border-border/50">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2">
                {sale.code && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {sale.code}
                  </Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={`${SALE_STATUS_COLORS[status]}`}
                >
                  {SALE_STATUS_LABELS[status]}
                </Badge>
              </DialogTitle>
              <span className="text-muted-foreground font-normal text-sm">
                {format(new Date(sale.created_at), "d MMM yyyy", { locale: pt })}
              </span>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-10rem)]">
            <div className="p-6 space-y-6">
              {/* Status & Payment Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estado da Venda</Label>
                  <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SALE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SALE_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Estado do Pagamento</Label>
                  <Select value={paymentStatus} onValueChange={handlePaymentStatusChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {PAYMENT_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Value */}
              <div className="space-y-2">
                <Label>Valor Total</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.01"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleValueBlur}
                    className="text-xl font-bold"
                  />
                  <span className="text-muted-foreground">€</span>
                </div>
                {(sale.discount || 0) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Subtotal: {formatCurrency(sale.subtotal || 0)} | Desconto: -{formatCurrency(sale.discount || 0)}
                  </p>
                )}
              </div>

              <Separator />

              {/* Sale Items */}
              {saleItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-muted-foreground">Produtos/Serviços</Label>
                  </div>
                  <div className="space-y-2">
                    {saleItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                      >
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} × {formatCurrency(item.unit_price)}
                          </p>
                        </div>
                        <p className="font-semibold">{formatCurrency(item.total)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Info */}
              {(sale.payment_method || sale.due_date || sale.invoice_reference) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-muted-foreground">Informação de Pagamento</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30">
                    {sale.payment_method && (
                      <div>
                        <p className="text-xs text-muted-foreground">Método</p>
                        <p className="text-sm font-medium">
                          {PAYMENT_METHOD_LABELS[sale.payment_method as PaymentMethod] || sale.payment_method}
                        </p>
                      </div>
                    )}
                    {sale.due_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Vencimento</p>
                        <p className="text-sm font-medium">
                          {format(new Date(sale.due_date), "d MMM yyyy", { locale: pt })}
                        </p>
                      </div>
                    )}
                    {sale.paid_date && (
                      <div>
                        <p className="text-xs text-muted-foreground">Data Pagamento</p>
                        <p className="text-sm font-medium text-green-500">
                          {format(new Date(sale.paid_date), "d MMM yyyy", { locale: pt })}
                        </p>
                      </div>
                    )}
                    {sale.invoice_reference && (
                      <div>
                        <p className="text-xs text-muted-foreground">Referência</p>
                        <p className="text-sm font-medium">{sale.invoice_reference}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Client/Lead Info */}
              {(sale.client || sale.lead) && (
                <div className="space-y-3">
                  <Label className="text-muted-foreground">Cliente</Label>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{sale.client?.name || sale.lead?.name}</span>
                      {sale.client?.code && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {sale.client.code}
                        </Badge>
                      )}
                    </div>
                    {sale.lead?.email && (
                      <p className="text-sm text-muted-foreground pl-6">{sale.lead.email}</p>
                    )}
                    {sale.lead?.phone && (
                      <div className="flex items-center gap-2 pl-6">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{sale.lead.phone}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-green-500 hover:text-green-400"
                          onClick={openWhatsApp}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          WhatsApp
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Proposal Info */}
              {sale.proposal && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Proposta Associada</Label>
                  <div className="flex items-center gap-2 text-sm p-3 bg-muted/30 rounded-lg">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {sale.proposal.code && (
                      <Badge variant="outline" className="font-mono text-xs">
                        {sale.proposal.code}
                      </Badge>
                    )}
                    <span>
                      {format(new Date(sale.proposal.proposal_date), "d MMM yyyy", { locale: pt })}
                    </span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Notes */}
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  placeholder="Adicionar notas sobre esta venda..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="p-4 border-t border-border/50">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Venda
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar esta venda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
