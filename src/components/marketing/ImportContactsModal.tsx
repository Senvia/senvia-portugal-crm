import { useState, useCallback, useRef } from "react";
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, Loader2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useContactLists, useCreateContactList, useAddListMembers } from "@/hooks/useContactLists";
import { useClients } from "@/hooks/useClients";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 1 | 2 | 3 | 4;

const SYSTEM_FIELDS = [
  { key: "name", label: "Nome", required: true },
  { key: "email", label: "Email", required: false },
  { key: "phone", label: "Telefone", required: false },
  { key: "company", label: "Empresa", required: false },
];

export function ImportContactsModal({ open, onOpenChange }: Props) {
  const { organization } = useAuth();
  const { data: lists = [] } = useContactLists();
  const { data: existingClients = [] } = useClients();
  const createList = useCreateContactList();
  const addMembers = useAddListMembers();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [selectedListId, setSelectedListId] = useState("");
  const [newListName, setNewListName] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ imported: number; duplicates: number; errors: number } | null>(null);

  const reset = () => {
    setStep(1);
    setFileName("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setSelectedListId("");
    setNewListName("");
    setCreatingNew(false);
    setImporting(false);
    setProgress(0);
    setResult(null);
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  const handleFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });

      if (json.length === 0) { toast.error("Ficheiro vazio"); return; }

      const fileHeaders = Object.keys(json[0]);
      setHeaders(fileHeaders);
      setRows(json.slice(0, 1000)); // Limit

      // Auto-map
      const autoMap: Record<string, string> = {};
      SYSTEM_FIELDS.forEach(f => {
        const match = fileHeaders.find(h => h.toLowerCase().includes(f.key) || h.toLowerCase().includes(f.label.toLowerCase()));
        if (match) autoMap[f.key] = match;
      });
      setMapping(autoMap);
      setStep(2);
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const previewRows = rows.slice(0, 3);
  const mappedName = mapping.name;

  const handleImport = async () => {
    if (!organization?.id) return;
    setImporting(true);
    setProgress(0);

    try {
      // Resolve list
      let listId = selectedListId;
      if (creatingNew && newListName.trim()) {
        const newList = await createList.mutateAsync({ name: newListName });
        listId = newList.id;
      }

      if (!listId) { toast.error("Selecione uma lista"); setImporting(false); return; }

      const emailMap = new Map(existingClients.filter(c => c.email).map(c => [c.email!.toLowerCase(), c.id]));
      let imported = 0, duplicates = 0, errors = 0;
      const clientIds: string[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const name = mapping.name ? String(row[mapping.name] || "").trim() : "";
          const email = mapping.email ? String(row[mapping.email] || "").trim().toLowerCase() : "";
          const phone = mapping.phone ? String(row[mapping.phone] || "").trim() : "";
          const company = mapping.company ? String(row[mapping.company] || "").trim() : "";

          if (!name) { errors++; continue; }

          let clientId: string;
          if (email && emailMap.has(email)) {
            clientId = emailMap.get(email)!;
            duplicates++;
          } else {
            const { data, error } = await supabase
              .from("crm_clients")
              .insert({ name, email: email || null, phone: phone || null, company: company || null, organization_id: organization.id, source: "import" })
              .select("id")
              .single();
            if (error) { errors++; continue; }
            clientId = data.id;
            if (email) emailMap.set(email, clientId);
            imported++;
          }
          clientIds.push(clientId);
        } catch { errors++; }

        if (i % 20 === 0) setProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      // Add to list
      if (clientIds.length > 0) {
        await addMembers.mutateAsync({ listId, clientIds });
      }

      setProgress(100);
      setResult({ imported, duplicates, errors });
    } catch {
      toast.error("Erro na importação");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Step 1: Upload */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Importar Contactos</DialogTitle>
              <DialogDescription>Passo 1 de 4 — Carregar ficheiro</DialogDescription>
            </DialogHeader>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Arraste um ficheiro ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground mt-1">.xlsx, .xls ou .csv (máx. 1000 linhas)</p>
              <input ref={fileRef} type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            </DialogFooter>
          </>
        )}

        {/* Step 2: Map */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Mapear Campos</DialogTitle>
              <DialogDescription>Passo 2 de 4 — Associe as colunas do ficheiro</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{fileName}</span>
                <Badge variant="secondary">{rows.length} linhas</Badge>
              </div>
              {SYSTEM_FIELDS.map(f => (
                <div key={f.key} className="flex items-center gap-3">
                  <Label className="w-24 text-sm">{f.label} {f.required && <span className="text-destructive">*</span>}</Label>
                  <Select value={mapping[f.key] || ""} onValueChange={v => setMapping(prev => ({ ...prev, [f.key]: v }))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecionar coluna..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Ignorar —</SelectItem>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
              {previewRows.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-2">Pré-visualização:</p>
                  <ScrollArea className="max-h-[120px] border rounded-md">
                    <div className="p-2 space-y-1 text-xs">
                      {previewRows.map((row, i) => (
                        <div key={i} className="flex gap-4 p-1 rounded bg-muted/30">
                          {SYSTEM_FIELDS.map(f => (
                            <span key={f.key} className="truncate">
                              <span className="text-muted-foreground">{f.label}:</span>{" "}
                              {mapping[f.key] && mapping[f.key] !== "__none__" ? row[mapping[f.key]] || "—" : "—"}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)} disabled={!mappedName || mappedName === "__none__"}>
                Continuar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 3: Select/Create List */}
        {step === 3 && (
          <>
            <DialogHeader>
              <DialogTitle>Selecionar Lista</DialogTitle>
              <DialogDescription>Passo 3 de 4 — Escolha ou crie uma lista</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {!creatingNew ? (
                <>
                  <div className="space-y-2">
                    <Label>Lista existente</Label>
                    <Select value={selectedListId} onValueChange={setSelectedListId}>
                      <SelectTrigger><SelectValue placeholder="Selecionar lista..." /></SelectTrigger>
                      <SelectContent>
                        {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.member_count})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-center">
                    <Button variant="link" size="sm" onClick={() => setCreatingNew(true)}>Ou criar nova lista</Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Nome da nova lista</Label>
                    <Input placeholder="Ex: Importação Janeiro" value={newListName} onChange={e => setNewListName(e.target.value)} />
                  </div>
                  <Button variant="link" size="sm" onClick={() => setCreatingNew(false)}>
                    <ArrowLeft className="h-3 w-3 mr-1" /> Usar lista existente
                  </Button>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={() => setStep(4)} disabled={!creatingNew ? !selectedListId : !newListName.trim()}>
                Continuar <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Step 4: Finalize */}
        {step === 4 && (
          <>
            <DialogHeader>
              <DialogTitle>{result ? "Importação Concluída" : "Finalizar Importação"}</DialogTitle>
              <DialogDescription>{result ? "Resultado da importação" : "Passo 4 de 4 — Reveja e importe"}</DialogDescription>
            </DialogHeader>

            {result ? (
              <div className="space-y-3 py-4">
                <div className="flex items-center justify-center">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-medium">Importação concluída!</p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold text-primary">{result.imported}</p>
                    <p className="text-xs text-muted-foreground">Novos</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{result.duplicates}</p>
                    <p className="text-xs text-muted-foreground">Existentes</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-lg font-bold text-destructive">{result.errors}</p>
                    <p className="text-xs text-muted-foreground">Erros</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ficheiro:</span>
                    <span className="font-medium">{fileName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Contactos:</span>
                    <span className="font-medium">{rows.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lista:</span>
                    <span className="font-medium">{creatingNew ? newListName : lists.find(l => l.id === selectedListId)?.name}</span>
                  </div>
                </div>
                {importing && (
                  <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-xs text-center text-muted-foreground">A importar... {progress}%</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              {result ? (
                <Button onClick={handleClose}>Fechar</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setStep(3)} disabled={importing}>Voltar</Button>
                  <Button onClick={handleImport} disabled={importing}>
                    {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A importar...</> : "Importar"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
