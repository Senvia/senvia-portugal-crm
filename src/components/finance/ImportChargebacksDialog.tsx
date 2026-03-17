import { forwardRef, useEffect, useMemo, useState } from "react";
import { Loader2, FileSearch } from "lucide-react";
import { toast } from "sonner";
import { ImportStep1Upload } from "@/components/marketing/import/ImportStep1Upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useImportCommissionChargebacks, type ImportChargebackSummary } from "@/hooks/useCommissionAnalysis";
import { formatCurrency } from "@/lib/format";

interface ImportChargebacksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function detectCpeColumn(headers: string[]) {
  return headers.find((header) => {
    const normalized = normalizeHeader(header);
    return normalized === "cpe" || normalized.includes("cpe") || normalized.includes("cui");
  });
}

function detectAmountColumn(headers: string[]) {
  const scored = headers
    .map((header) => {
      const normalized = normalizeHeader(header);
      let score = 0;
      if (normalized.includes("chargeback")) score += 8;
      if (normalized.includes("valor")) score += 4;
      if (normalized.includes("montante")) score += 4;
      if (normalized.includes("amount")) score += 3;
      if (normalized.includes("euro") || normalized.includes("eur")) score += 2;
      return { header, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.header;
}

export const ImportChargebacksDialog = forwardRef<HTMLDivElement, ImportChargebacksDialogProps>(function ImportChargebacksDialog({ open, onOpenChange }, ref) {
  const importChargebacks = useImportCommissionChargebacks();
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [selectedCpeColumn, setSelectedCpeColumn] = useState("");
  const [importSummary, setImportSummary] = useState<ImportChargebackSummary | null>(null);

  const detectedAmountColumn = useMemo(() => detectAmountColumn(headers), [headers]);
  const suggestedCpeColumn = useMemo(() => detectCpeColumn(headers), [headers]);

  useEffect(() => {
    if (!open) {
      setFileName("");
      setHeaders([]);
      setRows([]);
      setSelectedCpeColumn("");
      setImportSummary(null);
      return;
    }

    if (!selectedCpeColumn && suggestedCpeColumn) {
      setSelectedCpeColumn(suggestedCpeColumn);
    }
  }, [open, selectedCpeColumn, suggestedCpeColumn]);

  const preparedRows = useMemo(() => {
    if (!selectedCpeColumn || !detectedAmountColumn) return [];

    return rows.map((row) => {
      const normalizedRow = Object.fromEntries(
        headers.map((header) => [header, String(row[header] ?? "")])
      ) as Record<string, string>;

      return {
        ...normalizedRow,
        cpe: String(row[selectedCpeColumn] ?? ""),
        chargeback_amount: String(row[detectedAmountColumn] ?? "0"),
      };
    });
  }, [detectedAmountColumn, headers, rows, selectedCpeColumn]);

  const handleImport = async () => {
    if (!fileName || preparedRows.length === 0 || !selectedCpeColumn || !detectedAmountColumn) return;

    try {
      const summary = await importChargebacks.mutateAsync({
        fileName,
        cpeColumnName: selectedCpeColumn,
        rows: preparedRows,
      });

      setImportSummary(summary);
      toast.success("Chargebacks importados com sucesso.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar chargebacks.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={ref} variant="fullScreen" className="flex h-full flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-4 py-4 pr-14 sm:px-6">
          <DialogTitle>Importar chargebacks</DialogTitle>
          <DialogDescription>
            Carregue o ficheiro, escolha a coluna CPE e o sistema associa os chargebacks aos comerciais.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            {importSummary ? (
              <div className="rounded-xl border border-primary/20 bg-primary/10 p-4">
                <p className="text-sm font-medium text-foreground">Importação concluída</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Chargebacks no ficheiro</p>
                    <p className="text-lg font-semibold text-foreground">{importSummary.chargeback_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Associados</p>
                    <p className="text-lg font-semibold text-foreground">{importSummary.matched_rows}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sem match</p>
                    <p className="text-lg font-semibold text-foreground">{importSummary.unmatched_rows}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Valor total</p>
                    <p className="text-lg font-semibold text-foreground">{formatCurrency(importSummary.total_chargeback_amount || 0)}</p>
                  </div>
                </div>
              </div>
            ) : null}

            <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">1. Carregar ficheiro</h3>
                <p className="text-sm text-muted-foreground">Suporta Excel, CSV ou TXT com até 1000 linhas por importação.</p>
              </div>

              <ImportStep1Upload
                fileName={fileName}
                headers={headers}
                rows={rows}
                onFileLoaded={(nextFileName, nextHeaders, nextRows) => {
                  setFileName(nextFileName);
                  setHeaders(nextHeaders);
                  setRows(nextRows);
                  setSelectedCpeColumn(detectCpeColumn(nextHeaders) || "");
                  setImportSummary(null);
                }}
                onClearFile={() => {
                  setFileName("");
                  setHeaders([]);
                  setRows([]);
                  setSelectedCpeColumn("");
                  setImportSummary(null);
                }}
              />
            </section>

            <section className="space-y-4 rounded-xl border bg-card p-4 sm:p-5">
              <div>
                <h3 className="text-sm font-semibold text-foreground">2. Mapeamento</h3>
                <p className="text-sm text-muted-foreground">Só precisa de indicar a coluna do CPE; o valor é detetado automaticamente pelo layout esperado.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chargeback-cpe-column">Coluna CPE</Label>
                  <Select value={selectedCpeColumn} onValueChange={setSelectedCpeColumn}>
                    <SelectTrigger id="chargeback-cpe-column">
                      <SelectValue placeholder="Selecionar coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Coluna valor chargeback</Label>
                  <div className="flex min-h-10 items-center rounded-md border bg-muted/40 px-3 text-sm text-foreground">
                    {detectedAmountColumn || "Não detetada automaticamente"}
                  </div>
                </div>
              </div>

              {!detectedAmountColumn ? (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  Não encontrei a coluna do valor de chargeback. O ficheiro precisa de uma coluna identificável como “chargeback”, “valor”, “montante” ou “amount”.
                </div>
              ) : null}

              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <FileSearch className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-foreground">Resumo antes de importar</p>
                    <p className="text-muted-foreground">Linhas lidas: {rows.length}</p>
                    <p className="text-muted-foreground">Chargebacks estimados no ficheiro: {preparedRows.length}</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="shrink-0 border-t px-4 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!fileName || preparedRows.length === 0 || !selectedCpeColumn || !detectedAmountColumn || importChargebacks.isPending}
            >
              {importChargebacks.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Importar chargebacks
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});
