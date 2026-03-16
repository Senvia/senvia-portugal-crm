import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useDistributeProspects } from "@/hooks/useProspects";
import type { ProspectSalesperson } from "@/types/prospects";
import { Loader2, Users } from "lucide-react";

interface DistributeProspectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  selectedIds: string[];
  salespeople: ProspectSalesperson[];
  onDistributed?: () => void;
}

export function DistributeProspectsDialog({
  open,
  onOpenChange,
  selectedCount,
  selectedIds,
  salespeople,
  onDistributed,
}: DistributeProspectsDialogProps) {
  const distributeProspects = useDistributeProspects();
  const [quantityInput, setQuantityInput] = useState(String(selectedCount));

  useEffect(() => {
    if (open) {
      setQuantityInput(String(selectedCount));
    }
  }, [open, selectedCount]);

  const parsedQuantity = useMemo(() => {
    const trimmedValue = quantityInput.trim();
    if (!trimmedValue) return 0;

    const value = Number.parseInt(trimmedValue, 10);
    return Number.isNaN(value) ? 0 : value;
  }, [quantityInput]);

  const hasValidQuantity = parsedQuantity >= 1 && parsedQuantity <= selectedCount;
  const isDisabled =
    selectedIds.length === 0 ||
    salespeople.length === 0 ||
    distributeProspects.isPending ||
    !hasValidQuantity;

  const handleDistribute = async () => {
    if (isDisabled) return;

    await distributeProspects.mutateAsync({
      prospectIds: selectedIds,
      quantity: parsedQuantity,
    });
    onDistributed?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullScreen" className="flex h-full flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-4 md:px-6">
          <DialogTitle>Distribuir leads selecionados</DialogTitle>
          <DialogDescription>
            Escolhe quantos dos prospects selecionados queres distribuir agora. O sistema usa os primeiros da tua seleção.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div className="space-y-4">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-medium">Quantidade selecionada</p>
                <p className="mt-2 text-3xl font-semibold">{selectedCount}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Estes são os prospects elegíveis que selecionaste na lista.
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <label htmlFor="prospects-quantity" className="text-sm font-medium">
                  Quantidade a distribuir
                </label>
                <Input
                  id="prospects-quantity"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={selectedCount}
                  step={1}
                  value={quantityInput}
                  onChange={(event) => setQuantityInput(event.target.value)}
                  className="mt-3"
                />
                <p className="mt-2 text-sm text-muted-foreground">
                  Podes distribuir entre 1 e {selectedCount} prospect{selectedCount === 1 ? "" : "s"}.
                </p>
                {!hasValidQuantity ? (
                  <p className="mt-2 text-sm text-destructive">
                    Introduz uma quantidade válida dentro do total selecionado.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Serão distribuídos os primeiros {parsedQuantity} prospect{parsedQuantity === 1 ? "" : "s"} da seleção atual.
                  </p>
                )}
              </div>
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
              Distribuir {parsedQuantity || 0} lead{parsedQuantity === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
