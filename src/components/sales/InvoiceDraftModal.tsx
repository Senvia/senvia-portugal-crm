import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Receipt, FileText, User, Calendar, CreditCard, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/types/sales";
import type { PaymentMethod } from "@/types/sales";

interface InvoiceDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  documentType: "invoice" | "invoice_receipt";
  clientName?: string | null;
  clientNif?: string | null;
  paymentAmount: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod | null;
  taxConfig?: {
    tax_rate?: number;
    tax_exemption_reason?: string;
  } | null;
}

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  invoice: "Fatura",
  invoice_receipt: "Fatura-Recibo",
};

export function InvoiceDraftModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  documentType,
  clientName,
  clientNif,
  paymentAmount,
  paymentDate,
  paymentMethod,
  taxConfig,
}: InvoiceDraftModalProps) {
  const today = new Date();
  const taxRate = taxConfig?.tax_rate ?? 0;
  const isExempt = taxRate === 0;
  const exemptionReason = taxConfig?.tax_exemption_reason || "Artigo 53.º do CIVA";

  const taxAmount = isExempt ? 0 : paymentAmount * (taxRate / 100);
  const totalWithTax = paymentAmount + taxAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Rascunho de {DOCUMENT_TYPE_LABELS[documentType]}
          </DialogTitle>
          <DialogDescription>
            Reveja os dados antes de emitir o documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Type & Date */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {DOCUMENT_TYPE_LABELS[documentType]}
            </Badge>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {format(today, "d MMM yyyy", { locale: pt })}
            </div>
          </div>

          <Separator />

          {/* Client Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span>Cliente</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 space-y-1">
              <p className="text-sm font-medium">{clientName || "—"}</p>
              {clientNif && (
                <p className="text-xs text-muted-foreground font-mono">
                  NIF: {clientNif}
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              <span>Detalhes do Pagamento</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Data do pagamento</span>
                <span>{format(new Date(paymentDate), "d MMM yyyy", { locale: pt })}</span>
              </div>
              {paymentMethod && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Método</span>
                  <span>{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Tax & Totals */}
          <div className="p-3 rounded-lg border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(paymentAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                IVA {isExempt ? "(Isento)" : `(${taxRate}%)`}
              </span>
              <span>
                {isExempt ? (
                  <span className="text-xs text-muted-foreground">{exemptionReason}</span>
                ) : (
                  formatCurrency(taxAmount)
                )}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(totalWithTax)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                A emitir...
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4 mr-2" />
                Emitir {DOCUMENT_TYPE_LABELS[documentType]}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
