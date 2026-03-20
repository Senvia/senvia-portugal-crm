import { useEffect, useMemo, useState } from "react";
import { Loader2, FileSearch, Filter, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { ImportStep1Upload } from "@/components/marketing/import/ImportStep1Upload";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  // Prioritize EDP-specific column name
  const edpCol = headers.find((header) => {
    const normalized = normalizeHeader(header);
    return normalized.includes("local de consumo") || normalized.includes("local consumo");
  });
  if (edpCol) return edpCol;

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

function detectTypeColumn(headers: string[]) {
  // Prioritize "tipo de comissão/comissao" over generic "tipo"
  const comissaoCol = headers.find((header) => {
    const normalized = normalizeHeader(header);
    return normalized.includes("comissao") && normalized.includes("tipo");
  });
  if (comissaoCol) return comissaoCol;

  return headers.find((header) => {
    const normalized = normalizeHeader(header);
    return (
      normalized === "tipo" ||
      normalized === "type" ||
      normalized.includes("natureza") ||
      normalized.includes("movimento") ||
      normalized.includes("cod") ||
      normalized.includes("code")
    );
  });
}

export function ImportChargebacksDialog({ open, onOpenChange }: ImportChargebacksDialogProps) {
  const importChargebacks = useImportCommissionChargebacks();
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [selectedCpeColumn, setSelectedCpeColumn] = useState("");
  const [selectedAmountColumn, setSelectedAmountColumn] = useState("");
  const [selectedTypeColumn, setSelectedTypeColumn] = useState("");
  const [typeFilterValue, setTypeFilterValue] = useState("");
  const [importSummary, setImportSummary] = useState<ImportChargebackSummary | null>(null);

  const suggestedCpeColumn = useMemo(() => detectCpeColumn(headers), [headers]);
  const suggestedAmountColumn = useMemo(() => detectAmountColumn(headers), [headers]);
  const suggestedTypeColumn = useMemo(() => detectTypeColumn(headers), [headers]);

  useEffect(() => {
    if (!open) {
      setFileName("");
      setHeaders([]);
      setRows([]);
      setSelectedCpeColumn("");
      setSelectedAmountColumn("");
      setSelectedTypeColumn("");
      setTypeFilterValue("");
      setImportSummary(null);
      return;
    }

    if (!selectedCpeColumn && suggestedCpeColumn) {
      setSelectedCpeColumn(suggestedCpeColumn);
    }
    if (!selectedAmountColumn && suggestedAmountColumn) {
      setSelectedAmountColumn(suggestedAmountColumn);
    }
    if (!selectedTypeColumn && suggestedTypeColumn) {
      setSelectedTypeColumn(suggestedTypeColumn);
    }
  }, [open, selectedCpeColumn, suggestedCpeColumn, selectedAmountColumn, suggestedAmountColumn, selectedTypeColumn, suggestedTypeColumn]);

  const filteredRows = useMemo(() => {
    if (!selectedTypeColumn || !typeFilterValue.trim()) return rows;
    const normalizedFilter = typeFilterValue.trim().toLowerCase();
    return rows.filter((row) => {
      const cellValue = String(row[selectedTypeColumn] ?? "").trim().toLowerCase();
      return cellValue === normalizedFilter;
    });
  }, [rows, selectedTypeColumn, typeFilterValue]);

  const preparedRows = useMemo(() => {
    if (!selectedCpeColumn || !selectedAmountColumn) return [];

    return filteredRows
      .map((row) => ({
        cpe: String(row[selectedCpeColumn] ?? "").trim(),
        chargeback_amount: String(row[selectedAmountColumn] ?? "0").trim(),
      }))
      .filter((row) => row.cpe.length > 0);
  }, [selectedAmountColumn, filteredRows, selectedCpeColumn]);

  const handleImport = async () => {
    if (!fileName || preparedRows.length === 0 || !selectedCpeColumn || !selectedAmountColumn) return;

    try {
      await importChargebacks.mutateAsync({
        fileName,
        cpeColumnName: selectedCpeColumn,
        rows: preparedRows,
      });

      toast.success("Ficheiro importado com sucesso.");
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Chargeback import error:", error);
      let msg = "Erro ao importar chargebacks.";
      if (error && typeof error === "object") {
        const e = error as Record<string, unknown>;
        if (typeof e.message === "string" && e.message.length > 0) {
          msg = e.message;
        } else if (typeof e.details === "string" && e.details.length > 0) {
          msg = e.details;
        }
      } else if (typeof error === "string") {
        msg = error;
      }
      toast.error(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullScreen" className="flex h-full flex-col overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-4 py-4 pr-14 sm:px-6">
          <DialogTitle>Importar</DialogTitle>
          <DialogDescription>
            Carregue o ficheiro e o sistema associa automaticamente aos comerciais.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">

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
                  setSelectedAmountColumn(detectAmountColumn(nextHeaders) || "");
                  setSelectedTypeColumn(detectTypeColumn(nextHeaders) || "");
                  setTypeFilterValue("");
                  setImportSummary(null);
                }}
                onClearFile={() => {
                  setFileName("");
                  setHeaders([]);
                  setRows([]);
                  setSelectedCpeColumn("");
                  setSelectedAmountColumn("");
                  setSelectedTypeColumn("");
                  setTypeFilterValue("");
                  setImportSummary(null);
                }}
              />
            </section>

            {headers.length > 0 && !selectedCpeColumn && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Não foi possível detectar a coluna CPE automaticamente. Verifique se o ficheiro contém a coluna "Linha de Contrato: Local de Consumo" ou "CPE".
                </AlertDescription>
              </Alert>
            )}

            {headers.length > 0 && !selectedAmountColumn && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Não foi possível detectar a coluna de valor automaticamente. Verifique se o ficheiro contém uma coluna com "chargeback", "valor" ou "montante".
                </AlertDescription>
              </Alert>
            )}

            {headers.length > 0 && selectedCpeColumn && selectedAmountColumn && (
              <section className="space-y-3 rounded-xl border bg-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <FileSearch className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-foreground">Resumo antes de importar</p>
                    <p className="text-muted-foreground">Linhas lidas: {rows.length}</p>
                    {selectedTypeColumn ? (
                      <p className="text-muted-foreground flex items-center gap-1.5">
                        <Filter className="h-3 w-3" />
                        Linhas filtradas ({typeFilterValue || "—"}): {filteredRows.length}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground">Linhas válidas (com CPE): {preparedRows.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      CPE: <span className="font-medium text-foreground">{selectedCpeColumn}</span> · Valor: <span className="font-medium text-foreground">{selectedAmountColumn}</span>
                      {selectedTypeColumn ? <> · Tipo: <span className="font-medium text-foreground">{selectedTypeColumn}</span></> : null}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t px-4 py-4 sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!fileName || preparedRows.length === 0 || !selectedCpeColumn || !selectedAmountColumn || importChargebacks.isPending}
            >
              {importChargebacks.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Importar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}