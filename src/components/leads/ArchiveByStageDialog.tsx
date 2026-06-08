import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Archive } from "lucide-react";
import type { PipelineStage } from "@/hooks/usePipelineStages";

interface ArchiveByStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  counts: Record<string, number>;
  onConfirm: (stageKey: string) => void;
  isPending?: boolean;
}

export function ArchiveByStageDialog({
  open, onOpenChange, stages, counts, onConfirm, isPending,
}: ArchiveByStageDialogProps) {
  const [stageKey, setStageKey] = useState<string>("");
  const count = stageKey ? (counts[stageKey] ?? 0) : 0;

  // Statuses present on leads that have no matching registered pipeline stage
  // (e.g. left over from CSV imports). Without this, leads in those statuses
  // would never appear here and could not be archived by stage.
  const orphanStatuses = useMemo(() => {
    const stageKeys = new Set(stages.map((s) => s.key));
    return Object.keys(counts)
      .filter((k) => k && !stageKeys.has(k))
      .sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  }, [stages, counts]);

  const handleOpenChange = (o: boolean) => {
    if (!o) setStageKey("");
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Arquivar por etapa</DialogTitle>
          <DialogDescription>Arquiva todas as leads ativas de uma etapa. É reversível.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <Select value={stageKey} onValueChange={setStageKey}>
            <SelectTrigger>
              <SelectValue placeholder="Escolher etapa..." />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s.id} value={s.key}>
                  {s.name} ({counts[s.key] ?? 0})
                </SelectItem>
              ))}
              {orphanStatuses.length > 0 && (
                <>
                  <SelectSeparator />
                  <SelectLabel>Sem etapa (importadas)</SelectLabel>
                  {orphanStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status} ({counts[status] ?? 0})
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>

          {stageKey && (
            <p className="text-sm text-muted-foreground">
              Vais arquivar <strong>{count}</strong> lead(s) desta etapa.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => onConfirm(stageKey)} disabled={!stageKey || count === 0 || isPending}>
            <Archive className="h-4 w-4 mr-2" />
            Arquivar{count > 0 ? ` (${count})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
