import { useMemo, useState } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import { pt } from "date-fns/locale";
import { ChevronDown, FileSearch, FileUp, RefreshCw, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TeamMemberFilter } from "@/components/dashboard/TeamMemberFilter";
import { ImportChargebacksDialog } from "@/components/finance/ImportChargebacksDialog";
import { useCommissionAnalysis, useSyncFileToSystem, type CommissionAnalysisCommercial, type FileDataRow, type ComparisonRow, type SyncFileToSystemItem } from "@/hooks/useCommissionAnalysis";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { normalizeString } from "@/lib/utils";
import { NEGOTIATION_TYPE_LABELS, type NegotiationType } from "@/types/proposals";
import { toast } from "@/hooks/use-toast";

function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();

  for (let i = 0; i < 12; i += 1) {
    const date = startOfMonth(subMonths(now, i));
    options.push({
      value: format(date, "yyyy-MM-dd"),
      label: format(date, "MMMM yyyy", { locale: pt }),
    });
  }

  return options;
}

function CommissionAnalysisTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid grid-cols-9 gap-3">
              {Array.from({ length: 9 }).map((__, cellIndex) => (
                <Skeleton key={cellIndex} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonDataTable({ comparisonData }: { comparisonData: ComparisonRow[] }) {
  if (comparisonData.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Sem dados do ficheiro para este comercial.</p>;
  }

  const discrepancyCell = "bg-destructive/10 text-destructive font-medium";

  return (
    <div className="rounded-md border bg-muted/30 overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="text-xs">
            <TableHead className="h-8 min-w-[60px]">Fonte</TableHead>
            <TableHead className="h-8 min-w-[100px]">Tipo Comissão</TableHead>
            <TableHead className="h-8 min-w-[140px]">Nome da Empresa</TableHead>
            <TableHead className="h-8 min-w-[60px]">Tipo</TableHead>
            <TableHead className="h-8 min-w-[180px]">CPE</TableHead>
            <TableHead className="h-8 min-w-[60px]">DBL</TableHead>
            <TableHead className="h-8 text-right min-w-[100px]">Consumo anual</TableHead>
            <TableHead className="h-8 text-right min-w-[80px]">Duração (anos)</TableHead>
            <TableHead className="h-8 min-w-[90px]">Data Início</TableHead>
            <TableHead className="h-8 min-w-[90px]">Data Fim</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {comparisonData.map((row, idx) => (
            <>
              {/* File row */}
              <TableRow key={`file-${idx}`} className="text-xs border-b-0">
                <TableCell className="py-1.5">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Ficheiro
                  </span>
                </TableCell>
                <TableCell className="py-1.5">{row.file.tipoComissao || "—"}</TableCell>
                <TableCell className="py-1.5 truncate max-w-[160px]">{row.file.nomeEmpresa || "—"}</TableCell>
                <TableCell className="py-1.5">{row.file.tipo || "—"}</TableCell>
                <TableCell className="py-1.5 font-mono">{row.file.cpe || "—"}</TableCell>
                <TableCell className={`py-1.5 tabular-nums ${row.hasDblDiscrepancy ? discrepancyCell : ""}`}>
                  {row.file.dbl || "—"}
                </TableCell>
                <TableCell className={`py-1.5 text-right tabular-nums ${row.hasConsumoDiscrepancy ? discrepancyCell : ""}`}>
                  {row.file.consumoAnual || "—"}
                </TableCell>
                <TableCell className={`py-1.5 text-right tabular-nums ${row.hasDuracaoDiscrepancy ? discrepancyCell : ""}`}>
                  {row.file.duracaoContrato || "—"}
                </TableCell>
                <TableCell className="py-1.5">{row.file.dataInicio || "—"}</TableCell>
                <TableCell className="py-1.5">{row.file.dataFim || "—"}</TableCell>
              </TableRow>
              {/* System row */}
              <TableRow key={`sys-${idx}`} className="text-xs bg-muted/50 border-b">
                <TableCell className="py-1.5">
                  <span className="inline-flex items-center rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-secondary-foreground">
                    Sistema
                  </span>
                </TableCell>
                <TableCell className="py-1.5 text-muted-foreground">—</TableCell>
                <TableCell className="py-1.5 text-muted-foreground truncate max-w-[160px]">{row.systemClientName || "—"}</TableCell>
                <TableCell className="py-1.5 text-muted-foreground">{row.systemNegotiationType ? NEGOTIATION_TYPE_LABELS[row.systemNegotiationType as NegotiationType] ?? row.systemNegotiationType : "—"}</TableCell>
                <TableCell className="py-1.5 font-mono text-muted-foreground">{row.systemCpe || "—"}</TableCell>
                <TableCell className={`py-1.5 tabular-nums ${row.hasDblDiscrepancy ? discrepancyCell : "text-muted-foreground"}`}>
                  {row.systemDbl !== null ? row.systemDbl : "—"}
                </TableCell>
                <TableCell className={`py-1.5 text-right tabular-nums ${row.hasConsumoDiscrepancy ? discrepancyCell : "text-muted-foreground"}`}>
                  {row.systemConsumoAnual !== null ? row.systemConsumoAnual : "—"}
                </TableCell>
                <TableCell className={`py-1.5 text-right tabular-nums ${row.hasDuracaoDiscrepancy ? discrepancyCell : "text-muted-foreground"}`}>
                  {row.systemDuracao !== null ? row.systemDuracao : "—"}
                </TableCell>
                <TableCell className="py-1.5 text-muted-foreground">{row.systemDataInicio || "—"}</TableCell>
                <TableCell className="py-1.5 text-muted-foreground">{row.systemDataFim || "—"}</TableCell>
              </TableRow>
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function CommissionAnalysisTab() {
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [searchTerm, setSearchTerm] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [syncConfirmOpen, setSyncConfirmOpen] = useState(false);
  const { effectiveUserIds, canFilterByTeam } = useTeamFilter();
  const { data, isLoading } = useCommissionAnalysis(selectedMonth, effectiveUserIds);
  const syncMutation = useSyncFileToSystem();

  const filteredCommercials = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);
    if (!normalizedSearch) return data.commercials;

    return data.commercials.filter((item) => normalizeString(item.name).includes(normalizedSearch));
  }, [data.commercials, searchTerm]);

  // Collect all discrepant rows that can be synced
  const syncItems = useMemo<SyncFileToSystemItem[]>(() => {
    const items: SyncFileToSystemItem[] = [];
    for (const commercial of data.commercials) {
      for (const row of commercial.comparisonData) {
        if (row.hasAnyDiscrepancy && row.matchedProposalCpeId) {
          const parseNum = (s: string) => parseFloat(s.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
          items.push({
            proposalCpeId: row.matchedProposalCpeId,
            dbl: parseNum(row.file.dbl),
            consumoAnual: parseNum(row.file.consumoAnual),
            duracaoContrato: parseNum(row.file.duracaoContrato),
          });
        }
      }
    }
    return items;
  }, [data.commercials]);

  const handleSync = async () => {
    setSyncConfirmOpen(false);
    try {
      await syncMutation.mutateAsync(syncItems);
      toast({ title: "Sincronização concluída", description: `${syncItems.length} CPE(s) atualizados com os dados do ficheiro.` });
    } catch (err: any) {
      toast({ title: "Erro na sincronização", description: err.message || "Não foi possível atualizar os CPEs.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Análise de Comissões</h2>
          <p className="text-sm text-muted-foreground">
            Comparação entre ficheiro importado e dados do sistema, por comercial.
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {syncItems.length > 0 && (
            <Button variant="outline" onClick={() => setSyncConfirmOpen(true)} disabled={syncMutation.isPending} className="w-full sm:w-auto">
              <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              Sincronizar ({syncItems.length})
            </Button>
          )}
          <Button onClick={() => setImportOpen(true)} className="w-full sm:w-auto">
            <FileUp className="h-4 w-4" />
            Importar ficheiro
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 xl:flex-row">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-full xl:w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canFilterByTeam ? <TeamMemberFilter className="w-full xl:w-[220px]" /> : null}

        <div className="relative w-full xl:max-w-sm xl:ml-auto">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar comercial"
            className="pl-9"
          />
        </div>
      </div>

      {data.imports.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
          <FileUp className="h-3.5 w-3.5" />
          <span>
            Import ativo: <strong className="text-foreground">{data.imports[0]?.file_name}</strong>
            {" — "}
            {format(new Date(data.imports[0]?.created_at), "dd/MM/yyyy HH:mm")}
          </span>
        </div>
      )}

      {isLoading ? (
        <CommissionAnalysisTableSkeleton />
      ) : filteredCommercials.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comerciais</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="multiple">
              {filteredCommercials.map((commercial) => (
                <AccordionItem key={commercial.userId} value={commercial.userId} className="border-b last:border-b-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&>svg]:hidden justify-start">
                    <div className="flex w-full items-center gap-2 text-sm">
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                      <span className="font-medium text-foreground text-left">{commercial.name}</span>
                      {commercial.fileData.length > 0 && (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          {commercial.fileData.length} linha(s)
                        </span>
                      )}
                      {commercial.comparisonData.some((r) => r.hasAnyDiscrepancy) && (
                        <span className="inline-flex items-center rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                          {commercial.comparisonData.filter((r) => r.hasAnyDiscrepancy).length} discrepância(s)
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3 pt-0">
                    <ComparisonDataTable comparisonData={commercial.comparisonData} />
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-14 text-center">
            <FileSearch className="h-10 w-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Sem dados para mostrar</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Importe um ficheiro para ver a análise de comissões.
            </p>
          </CardContent>
        </Card>
      )}

      <ImportChargebacksDialog open={importOpen} onOpenChange={setImportOpen} />

      <AlertDialog open={syncConfirmOpen} onOpenChange={setSyncConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sincronizar dados do ficheiro</AlertDialogTitle>
            <AlertDialogDescription>
              Isto vai atualizar <strong>{syncItems.length} CPE(s)</strong> no sistema com os valores do ficheiro importado (DBL, Consumo anual e Duração). As comissões serão recalculadas automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSync}>Sincronizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
