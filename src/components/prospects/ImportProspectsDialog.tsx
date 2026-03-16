import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ImportStep1Upload } from "@/components/marketing/import/ImportStep1Upload";
import { useImportProspects } from "@/hooks/useProspects";
import { Loader2 } from "lucide-react";

interface ImportProspectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportProspectsDialog({ open, onOpenChange }: ImportProspectsDialogProps) {
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const importProspects = useImportProspects();

  useEffect(() => {
    if (!open) {
      setFileName("");
      setHeaders([]);
      setRows([]);
    }
  }, [open]);

  const handleImport = async () => {
    if (!fileName || rows.length === 0 || importProspects.isPending) return;

    await importProspects.mutateAsync({ fileName, rows });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullScreen" className="flex h-full flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-4 py-4 md:px-6">
          <DialogTitle>Importar prospects</DialogTitle>
          <DialogDescription>
            Suporta .xlsb, .xlsx, .xls, .csv e .txt com deduplicação automática por NIF + CPE e email.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
          <ImportStep1Upload
            fileName={fileName}
            headers={headers}
            rows={rows}
            onFileLoaded={(nextFileName, nextHeaders, nextRows) => {
              setFileName(nextFileName);
              setHeaders(nextHeaders);
              setRows(nextRows);
            }}
            onClearFile={() => {
              setFileName("");
              setHeaders([]);
              setRows([]);
            }}
            onConfirm={handleImport}
          />
        </div>

        <div className="border-t px-4 py-4 md:px-6">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={!fileName || rows.length === 0 || importProspects.isPending}>
              {importProspects.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar prospects
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
