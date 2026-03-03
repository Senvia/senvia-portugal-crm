import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useCommitments, CommitmentLine } from "@/hooks/useCommitments";
import { useAuth } from "@/contexts/AuthContext";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditCommitmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingLines: CommitmentLine[];
}

const emptyLine = (): CommitmentLine => ({
  nif: "",
  energia_mwh: 0,
  solar_kwp: 0,
  comissao: 0,
  proposal_id: null,
  notes: null,
});

export function EditCommitmentModal({ open, onOpenChange, existingLines }: EditCommitmentModalProps) {
  const { user } = useAuth();
  const { saveCommitment } = useCommitments(user?.id);
  const [lines, setLines] = useState<CommitmentLine[]>([]);

  useEffect(() => {
    if (open) {
      setLines(existingLines.length > 0 ? existingLines.map(l => ({ ...l })) : [emptyLine()]);
    }
  }, [open, existingLines]);

  const addLine = () => setLines([...lines, emptyLine()]);

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof CommitmentLine, value: any) => {
    setLines(lines.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const handleSave = () => {
    const validLines = lines.filter(l => l.nif.trim() !== "");
    saveCommitment.mutate(validLines, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 gap-0 sm:max-w-2xl">
        <DialogHeader className="p-4 md:p-6 pb-2">
          <DialogTitle>Editar Compromisso</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 md:px-6">
          <div className="space-y-4 pb-4">
            {lines.map((line, idx) => (
              <div key={idx} className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Linha {idx + 1}</span>
                  {lines.length > 1 && (
                    <Button variant="ghost" size="icon-sm" onClick={() => removeLine(idx)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="col-span-2 sm:col-span-4">
                    <Label className="text-xs">NIF</Label>
                    <Input
                      value={line.nif}
                      onChange={(e) => updateLine(idx, "nif", e.target.value)}
                      placeholder="NIF do cliente"
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Energia (MWh)</Label>
                    <Input
                      type="number"
                      value={line.energia_mwh || ""}
                      onChange={(e) => updateLine(idx, "energia_mwh", Number(e.target.value) || 0)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Solar (kWp)</Label>
                    <Input
                      type="number"
                      value={line.solar_kwp || ""}
                      onChange={(e) => updateLine(idx, "solar_kwp", Number(e.target.value) || 0)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Comissão (€)</Label>
                    <Input
                      type="number"
                      value={line.comissao || ""}
                      onChange={(e) => updateLine(idx, "comissao", Number(e.target.value) || 0)}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" size="sm" className="w-full" onClick={addLine}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Linha
            </Button>
          </div>
        </ScrollArea>

        <DialogFooter className="p-4 md:p-6 pt-2 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saveCommitment.isPending}>
            {saveCommitment.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
