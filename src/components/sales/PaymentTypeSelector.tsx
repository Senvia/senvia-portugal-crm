import { CheckCircle2, CalendarClock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";

interface PaymentTypeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingAmount: number;
  onSelectTotal: () => void;
  onSelectInstallments: () => void;
}

export function PaymentTypeSelector({
  open,
  onOpenChange,
  remainingAmount,
  onSelectTotal,
  onSelectInstallments,
}: PaymentTypeSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tipo de Pagamento</DialogTitle>
          <DialogDescription>
            Como deseja registar o pagamento?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Total */}
          <button
            type="button"
            onClick={onSelectTotal}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border border-border bg-card hover:border-primary hover:bg-accent/50 transition-all text-center cursor-pointer group"
          >
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Pagamento Total</p>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(remainingAmount)}
              </p>
            </div>
          </button>

          {/* Parcelado */}
          <button
            type="button"
            onClick={onSelectInstallments}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border border-border bg-card hover:border-primary hover:bg-accent/50 transition-all text-center cursor-pointer group"
          >
            <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <CalendarClock className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">Parcelado</p>
              <p className="text-xs text-muted-foreground">
                Dividir em parcelas
              </p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
