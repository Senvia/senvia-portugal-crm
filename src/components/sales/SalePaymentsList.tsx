import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Plus, Pencil, Trash2, CreditCard, Receipt, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { useSalePayments, useDeleteSalePayment, calculatePaymentSummary } from "@/hooks/useSalePayments";
import { formatCurrency } from "@/lib/format";
import { AddPaymentModal } from "./AddPaymentModal";
import type { SalePayment } from "@/types/sales";
import { 
  PAYMENT_METHOD_LABELS, 
  PAYMENT_RECORD_STATUS_LABELS,
  PAYMENT_RECORD_STATUS_COLORS 
} from "@/types/sales";

interface SalePaymentsListProps {
  saleId: string;
  organizationId: string;
  saleTotal: number;
  readonly?: boolean;
}

export function SalePaymentsList({ 
  saleId, 
  organizationId,
  saleTotal, 
  readonly = false 
}: SalePaymentsListProps) {
  const { data: payments = [], isLoading } = useSalePayments(saleId);
  const deletePayment = useDeleteSalePayment();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SalePayment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<SalePayment | null>(null);

  const summary = calculatePaymentSummary(payments, saleTotal);

  const handleDelete = () => {
    if (!deletingPayment) return;
    
    deletePayment.mutate(
      { paymentId: deletingPayment.id, saleId },
      { onSuccess: () => setDeletingPayment(null) }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Pagamentos</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-16 bg-muted/50 rounded-lg" />
          <div className="h-16 bg-muted/50 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Pagamentos</span>
            {payments.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {payments.length}
              </Badge>
            )}
          </div>
          {!readonly && summary.remaining > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>

        {/* Payments List */}
        {payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(payment.amount))}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${PAYMENT_RECORD_STATUS_COLORS[payment.status]}`}
                    >
                      {PAYMENT_RECORD_STATUS_LABELS[payment.status]}
                    </Badge>
                    {payment.payment_method && (
                      <Badge variant="secondary" className="text-xs">
                        {PAYMENT_METHOD_LABELS[payment.payment_method]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(payment.payment_date), "d MMM yyyy", { locale: pt })}
                    </span>
                    {payment.invoice_reference && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Receipt className="h-3 w-3" />
                          {payment.invoice_reference}
                        </span>
                      </>
                    )}
                  </div>
                  {payment.notes && (
                    <p className="text-xs text-muted-foreground truncate">
                      {payment.notes}
                    </p>
                  )}
                </div>

                {!readonly && payment.status !== 'paid' && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setEditingPayment(payment)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingPayment(payment)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-dashed text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Nenhum pagamento registado
            </p>
            {!readonly && summary.remaining > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Pagamento
              </Button>
            )}
          </div>
        )}

        {/* Summary */}
        {saleTotal > 0 && (
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{Math.round(summary.percentage)}%</span>
              </div>
              <Progress value={summary.percentage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Pago</p>
                <p className="font-semibold text-primary">
                  {formatCurrency(summary.totalPaid)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Em Falta</p>
                <p className={`font-semibold ${summary.remaining > 0 ? 'text-destructive' : 'text-primary'}`}>
                  {formatCurrency(summary.remaining)}
                </p>
              </div>
            </div>

            {summary.totalScheduled > 0 && (
              <div className="pt-2 border-t text-sm">
                <p className="text-muted-foreground">Agendado</p>
                <p className="font-medium text-secondary-foreground">
                  {formatCurrency(summary.totalScheduled)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AddPaymentModal
        open={showAddModal || !!editingPayment}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingPayment(null);
          }
        }}
        saleId={saleId}
        organizationId={organizationId}
        saleTotal={saleTotal}
        remaining={summary.remaining}
        payment={editingPayment}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPayment} onOpenChange={(open) => !open && setDeletingPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar este pagamento de{" "}
              <strong>{deletingPayment && formatCurrency(Number(deletingPayment.amount))}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
