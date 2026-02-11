import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Receipt, FileText, User, Calendar, CreditCard, Loader2, Info } from "lucide-react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_LABELS } from "@/types/sales";
import type { PaymentMethod } from "@/types/sales";

export interface DraftSaleItem {
  name: string;
  quantity: number;
  unit_price: number;
  tax_value?: number | null;
}

interface InvoiceDraftModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isLoading: boolean;
  mode: "invoice" | "receipt" | "invoice_receipt";
  clientName?: string | null;
  clientNif?: string | null;
  amount: number;
  paymentDate: string;
  paymentMethod?: PaymentMethod | null;
  taxConfig?: {
    tax_value?: number;
    tax_exemption_reason?: string;
  } | null;
  saleItems?: DraftSaleItem[];
  saleTotal?: number;
}

const MODE_LABELS = {
  invoice: { title: "Fatura", badge: "Fatura (FT)", button: "Emitir Fatura" },
  receipt: { title: "Recibo", badge: "Recibo (RC)", button: "Gerar Recibo" },
  invoice_receipt: { title: "Fatura-Recibo", badge: "Fatura-Recibo (FR)", button: "Emitir Fatura-Recibo" },
};

export function InvoiceDraftModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  mode,
  clientName,
  clientNif,
  amount,
  paymentDate,
  paymentMethod,
  taxConfig,
  saleItems = [],
  saleTotal,
}: InvoiceDraftModalProps) {
  const today = new Date();
  const labels = MODE_LABELS[mode];
  const orgTaxRate = taxConfig?.tax_value ?? 0;
  const exemptionReason = taxConfig?.tax_exemption_reason || "Artigo 53.º do CIVA";

  // Calculate per-item tax totals
  const ratio = mode === "invoice_receipt" && saleTotal && saleTotal > 0
    ? amount / saleTotal
    : 1;

  const itemsWithTax = saleItems.map((item) => {
    const effectiveTax = item.tax_value ?? orgTaxRate;
    const scaledPrice = item.unit_price * ratio;
    const lineTotal = scaledPrice * item.quantity;
    const lineTax = lineTotal * (effectiveTax / 100);
    return { ...item, effectiveTax, scaledPrice, lineTotal, lineTax };
  });

  const subtotal = itemsWithTax.reduce((s, i) => s + i.lineTotal, 0);
  const totalTax = itemsWithTax.reduce((s, i) => s + i.lineTax, 0);
  const totalWithTax = subtotal + totalTax;

  // Fallback if no items
  const hasItems = itemsWithTax.length > 0;
  const fallbackTax = hasItems ? totalTax : (orgTaxRate === 0 ? 0 : amount * (orgTaxRate / 100));
  const fallbackTotal = hasItems ? totalWithTax : amount + fallbackTax;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Rascunho de {labels.title}
          </DialogTitle>
          <DialogDescription>
            Reveja os dados antes de {mode === "invoice" ? "emitir a fatura" : mode === "invoice_receipt" ? "emitir a fatura-recibo" : "gerar o recibo"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Explanatory Alert */}
          <Alert variant="default" className="bg-muted/40 border-muted">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {mode === "invoice" && (
                <>Esta fatura cobre o <strong>valor total</strong> da venda ({formatCurrency(amount)}). Após emissão, gere um <strong>Recibo (RC)</strong> por cada pagamento recebido.</>
              )}
              {mode === "invoice_receipt" && (
                <>Esta fatura-recibo cobre <strong>apenas este pagamento</strong> de {formatCurrency(amount)}.{saleTotal && saleTotal > amount && " Os itens são proporcionais ao valor do pagamento."}</>
              )}
              {mode === "receipt" && (
                <>Este recibo comprova o <strong>pagamento de {formatCurrency(amount)}</strong> associado à fatura já emitida.</>
              )}
            </AlertDescription>
          </Alert>

          {/* Document Type & Date */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">
              {labels.badge}
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

          {/* Sale Items */}
          {hasItems && (mode === "invoice" || mode === "invoice_receipt") && (
            <>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Itens</span>
                </div>
                <div className="space-y-1.5">
                  {itemsWithTax.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded bg-muted/20 text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="truncate block">{item.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.scaledPrice)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.effectiveTax === 0 ? "Isento" : `IVA ${item.effectiveTax}%`}
                        </Badge>
                        <span className="font-medium text-xs">{formatCurrency(item.lineTotal)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Payment Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-3.5 w-3.5" />
              <span>{mode === "invoice" ? "Detalhes da Fatura" : mode === "invoice_receipt" ? "Detalhes da Fatura-Recibo" : "Detalhes do Pagamento"}</span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30 space-y-2">
              {(mode === "receipt" || mode === "invoice_receipt") && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data do pagamento</span>
                  <span>{format(new Date(paymentDate), "d MMM yyyy", { locale: pt })}</span>
                </div>
              )}
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
              <span className="text-muted-foreground">Subtotal (s/ IVA)</span>
              <span>{formatCurrency(hasItems ? subtotal : amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                IVA {!hasItems && orgTaxRate === 0 ? "(Isento)" : ""}
              </span>
              <span>
                {fallbackTax === 0 ? (
                  <span className="text-xs text-muted-foreground">{exemptionReason}</span>
                ) : (
                  formatCurrency(fallbackTax)
                )}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(fallbackTotal)}</span>
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
                {mode === "invoice" ? "A emitir..." : mode === "invoice_receipt" ? "A emitir..." : "A gerar..."}
              </>
            ) : (
              <>
                <Receipt className="h-4 w-4 mr-2" />
                {labels.button}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
