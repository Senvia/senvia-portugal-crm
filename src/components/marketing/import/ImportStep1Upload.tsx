import { useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, Download, X, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Props {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
  onFileLoaded: (fileName: string, headers: string[], rows: Record<string, string>[]) => void;
  onClearFile: () => void;
  onConfirm: () => void;
}

export function ImportStep1Upload({ fileName, headers, rows, onFileLoaded, onClearFile, onConfirm }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      if (json.length === 0) { toast.error("Ficheiro vazio"); return; }
      const fileHeaders = Object.keys(json[0]);
      onFileLoaded(file.name, fileHeaders, json.slice(0, 1000));
    };
    reader.readAsArrayBuffer(file);
  }, [onFileLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const downloadSample = () => {
    const csv = "Nome,Email,Telefone,Empresa\nJoão Silva,joao@exemplo.pt,912345678,Empresa ABC\nMaria Santos,maria@exemplo.pt,923456789,Empresa XYZ";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "exemplo-contactos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewRows = rows.slice(0, 10);

  return (
    <div className="space-y-4">
      <button onClick={downloadSample} className="text-sm text-primary hover:underline flex items-center gap-1.5">
        <Download className="h-3.5 w-3.5" />
        Baixe um arquivo de exemplo (.csv)
      </button>

      {!fileName ? (
        <div
          className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Selecione seu arquivo ou arraste e solte aqui</p>
          <p className="text-xs text-muted-foreground mt-1">.csv, .xlsx ou .txt (máx. 1000 linhas)</p>
          <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls,.csv,.txt" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Seu arquivo foi carregado.</p>
              <div className="flex items-center gap-2 mt-0.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate">{fileName}</span>
                <span className="text-xs text-muted-foreground">• {rows.length} linhas</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={onClearFile}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {previewRows.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Pré-visualização (primeiras {previewRows.length} linhas):</p>
              <ScrollArea className="max-h-[200px] border rounded-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {headers.map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-b last:border-0">
                          {headers.map(h => (
                            <td key={h} className="px-3 py-1.5 whitespace-nowrap max-w-[150px] truncate">{row[h] || "—"}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onConfirm}>Confirme seu arquivo</Button>
          </div>
        </>
      )}
    </div>
  );
}
