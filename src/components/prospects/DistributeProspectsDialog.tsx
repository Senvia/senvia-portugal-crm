import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const isDisabled = selectedIds.length === 0 || salespeople.length === 0 || distributeProspects.isPending;

  const handleDistribute = async () => {
    if (isDisabled) return;
    await distributeProspects.mutateAsync({ prospectIds: selectedIds });
    onDistributed?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullScreen" className="flex h-full flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-4 md:px-6">
          <DialogTitle>Distribuir leads selecionados</DialogTitle>
          <DialogDescription>
            O sistema vai distribuir em round-robin apenas os prospects selecionados e converter cada um em lead.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-medium">Quantidade selecionada</p>
              <p className="mt-2 text-3xl font-semibold">{selectedCount}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Serão distribuídos exatamente os prospects que selecionaste na lista.
              </p>
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
              Distribuir {selectedCount} lead{selectedCount === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
