import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useDistributeProspects } from "@/hooks/useProspects";
import type { ProspectSalesperson } from "@/types/prospects";
import { Loader2, Users } from "lucide-react";

interface DistributeProspectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  remainingCount: number;
  salespeople: ProspectSalesperson[];
}

export function DistributeProspectsDialog({
  open,
  onOpenChange,
  remainingCount,
  salespeople,
}: DistributeProspectsDialogProps) {
  const [quantity, setQuantity] = useState("");
  const distributeProspects = useDistributeProspects();

  useEffect(() => {
    if (open) {
      setQuantity(remainingCount > 0 ? String(Math.min(remainingCount, salespeople.length || remainingCount)) : "");
    }
  }, [open, remainingCount, salespeople.length]);

  const parsedQuantity = useMemo(() => {
    const value = Number(quantity);
    return Number.isFinite(value) ? value : 0;
  }, [quantity]);

  const isDisabled =
    parsedQuantity <= 0 ||
    parsedQuantity > remainingCount ||
    salespeople.length === 0 ||
    distributeProspects.isPending;

  const handleDistribute = async () => {
    if (isDisabled) return;
    await distributeProspects.mutateAsync({ quantity: parsedQuantity });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullScreen" className="flex h-full flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-4 md:px-6">
          <DialogTitle>Distribuir e converter prospects</DialogTitle>
          <DialogDescription>
            O sistema vai distribuir em round-robin só pelos comerciais elegíveis e converter cada prospect em lead.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-medium">Quantidade a distribuir</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Restantes disponíveis: <span className="font-medium text-foreground">{remainingCount}</span>
              </p>
              <Input
                min={1}
                max={remainingCount}
                type="number"
                inputMode="numeric"
                className="mt-4"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                placeholder="Ex.: 50"
              />
            </div>

            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium">Comerciais elegíveis</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {salespeople.length > 0 ? (
                  salespeople.map((salesperson) => (
                    <Badge key={salesperson.user_id} variant="secondary">
                      {salesperson.full_name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Não existem comerciais elegíveis nesta organização.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t px-4 py-4 md:px-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDistribute} disabled={isDisabled}>
              {distributeProspects.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Distribuir agora
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
