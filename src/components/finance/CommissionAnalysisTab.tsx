import { useMemo, useState } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import { pt } from "date-fns/locale";
import { AlertTriangle, ChevronDown, FileSearch, FileUp, Search, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TeamMemberFilter } from "@/components/dashboard/TeamMemberFilter";
import { ImportChargebacksDialog } from "@/components/finance/ImportChargebacksDialog";
import { useCommissionAnalysis, type CommissionAnalysisCommercial, type FileDataRow } from "@/hooks/useCommissionAnalysis";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { formatCurrency } from "@/lib/format";
import { normalizeString } from "@/lib/utils";
import { cn } from "@/lib/utils";

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

function SummaryMetric({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: typeof Wallet;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold text-foreground sm:text-2xl">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function CommissionAnalysisTableSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((__, cellIndex) => (
                <Skeleton key={cellIndex} className="h-10 w-full" />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** Match file rows to system CPEs by normalized CPE serial_number */
function matchFileToSystem(commercial: CommissionAnalysisCommercial) {
  const normalizeCpe = (s: string) => s.replace(/[^A-Z0-9]/gi, "").toUpperCase();

  const systemCpes = commercial.cpes.map((cpe) => ({
    ...cpe,
    normalizedSerial: normalizeCpe(cpe.serial_number || ""),
  }));

  const matched: { system: typeof systemCpes[number]; file: FileDataRow | null }[] = [];
  const unmatchedFile: FileDataRow[] = [];
  const usedSystemIndexes = new Set<number>();

  for (const fileRow of commercial.fileData) {
    const fileCpeNorm = normalizeCpe(fileRow.cpe);
    const idx = systemCpes.findIndex(
      (s, i) => !usedSystemIndexes.has(i) && s.normalizedSerial === fileCpeNorm
    );
    if (idx >= 0) {
      usedSystemIndexes.add(idx);
      matched.push({ system: systemCpes[idx], file: fileRow });
    } else {
      unmatchedFile.push(fileRow);
    }
  }

  // System CPEs without file match
  systemCpes.forEach((s, i) => {
    if (!usedSystemIndexes.has(i)) {
      matched.push({ system: s, file: null });
    }
  });

  return { matched, unmatchedFile };
}

function ComparisonSubTable({ commercial }: { commercial: CommissionAnalysisCommercial }) {
  const hasFileData = commercial.fileData.length > 0;

  if (!hasFileData) {
    // Show system data only
    if (commercial.cpes.length === 0) {
      return <p className="text-xs text-muted-foreground py-2">Sem CPEs associados a este comercial.</p>;
    }
    return (
      <div className="rounded-md border bg-muted/30 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="h-8">Venda</TableHead>
              <TableHead className="h-8">CPE</TableHead>
              <TableHead className="h-8 text-right">Consumo (kWh)</TableHead>
              <TableHead className="h-8 text-right">Margem</TableHead>
              <TableHead className="h-8 text-right">Valor a receber €</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commercial.cpes.map((cpe) => (
              <TableRow key={cpe.proposal_cpe_id} className="text-xs">
                <TableCell className="py-1.5 font-mono">{cpe.sale_code || "—"}</TableCell>
                <TableCell className="py-1.5 font-mono">{cpe.serial_number || "—"}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">
                  {cpe.consumo_anual.toLocaleString("pt-PT")}
                </TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{cpe.margem.toFixed(4)}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums font-medium">
                  {formatCurrency(cpe.comissao_indicativa)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Has file data — show comparative view
  const { matched, unmatchedFile } = matchFileToSystem(commercial);

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/30 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead className="h-8 min-w-[90px]">Tipo Comissão</TableHead>
              <TableHead className="h-8 min-w-[140px]">Empresa (ficheiro)</TableHead>
              <TableHead className="h-8 min-w-[80px]">Tipo</TableHead>
              <TableHead className="h-8 min-w-[180px]">CPE</TableHead>
              <TableHead className="h-8 text-right min-w-[100px]">Consumo (fich.)</TableHead>
              <TableHead className="h-8 text-right min-w-[100px]">Consumo (sist.)</TableHead>
              <TableHead className="h-8 text-right min-w-[60px]">Duração</TableHead>
              <TableHead className="h-8 min-w-[90px]">Início</TableHead>
              <TableHead className="h-8 min-w-[90px]">Fim</TableHead>
              <TableHead className="h-8 text-right min-w-[60px]">DBL (fich.)</TableHead>
              <TableHead className="h-8 text-right min-w-[80px]">Margem (sist.)</TableHead>
              <TableHead className="h-8 text-right min-w-[100px]">Valor receber (fich.)</TableHead>
              <TableHead className="h-8 text-right min-w-[100px]">Comissão (sist.)</TableHead>
              <TableHead className="h-8 min-w-[60px]">Match</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matched.map((row, idx) => {
              const hasFile = !!row.file;
              const hasSystem = !!row.system;
              return (
                <TableRow key={idx} className="text-xs">
                  <TableCell className="py-1.5">{row.file?.tipoComissao || "—"}</TableCell>
                  <TableCell className="py-1.5 truncate max-w-[160px]">{row.file?.nomeEmpresa || "—"}</TableCell>
                  <TableCell className="py-1.5">{row.file?.tipo || "—"}</TableCell>
                  <TableCell className="py-1.5 font-mono">
                    {row.file?.cpe || row.system?.serial_number || "—"}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">{row.file?.consumoAnual || "—"}</TableCell>
                  <TableCell className={cn(
                    "py-1.5 text-right tabular-nums",
                    hasFile && hasSystem && row.file?.consumoAnual && String(row.system.consumo_anual) !== row.file.consumoAnual && "text-amber-500 font-medium"
                  )}>
                    {hasSystem ? row.system.consumo_anual.toLocaleString("pt-PT") : "—"}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">{row.file?.duracaoContrato || "—"}</TableCell>
                  <TableCell className="py-1.5">{row.file?.dataInicio || "—"}</TableCell>
                  <TableCell className="py-1.5">{row.file?.dataFim || "—"}</TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">{row.file?.dbl || "—"}</TableCell>
                  <TableCell className={cn(
                    "py-1.5 text-right tabular-nums",
                    hasFile && hasSystem && row.file?.dbl && String(row.system.margem) !== row.file.dbl && "text-amber-500 font-medium"
                  )}>
                    {hasSystem ? row.system.margem.toFixed(3) : "—"}
                  </TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums">{row.file?.valorReceber || "—"}</TableCell>
                  <TableCell className="py-1.5 text-right tabular-nums font-medium">
                    {hasSystem ? formatCurrency(row.system.comissao_indicativa) : "—"}
                  </TableCell>
                  <TableCell className="py-1.5">
                    {hasFile && hasSystem ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">✓</span>
                    ) : hasSystem ? (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Só sist.</span>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
            {unmatchedFile.map((file, idx) => (
              <TableRow key={`unmatched-${idx}`} className="text-xs bg-amber-500/5">
                <TableCell className="py-1.5">{file.tipoComissao || "—"}</TableCell>
                <TableCell className="py-1.5 truncate max-w-[160px]">{file.nomeEmpresa || "—"}</TableCell>
                <TableCell className="py-1.5">{file.tipo || "—"}</TableCell>
                <TableCell className="py-1.5 font-mono">{file.cpe || "—"}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{file.consumoAnual || "—"}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums text-muted-foreground">—</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{file.duracaoContrato || "—"}</TableCell>
                <TableCell className="py-1.5">{file.dataInicio || "—"}</TableCell>
                <TableCell className="py-1.5">{file.dataFim || "—"}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{file.dbl || "—"}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums text-muted-foreground">—</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums">{file.valorReceber || "—"}</TableCell>
                <TableCell className="py-1.5 text-right tabular-nums text-muted-foreground">—</TableCell>
                <TableCell className="py-1.5">
                  <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600">Só fich.</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function CommissionAnalysisTab() {
  const monthOptions = useMemo(() => generateMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value ?? format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [searchTerm, setSearchTerm] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const { effectiveUserIds, canFilterByTeam } = useTeamFilter();
  const { data, isLoading } = useCommissionAnalysis(selectedMonth, effectiveUserIds);

  const filteredCommercials = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);
    if (!normalizedSearch) return data.commercials;

    return data.commercials.filter((item) => normalizeString(item.name).includes(normalizedSearch));
  }, [data.commercials, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Análise de Comissões</h2>
          <p className="text-sm text-muted-foreground">
            Comparação entre ficheiro importado e dados do sistema, por comercial.
          </p>
        </div>

        <Button onClick={() => setImportOpen(true)} className="w-full sm:w-auto">
          <FileUp className="h-4 w-4" />
          Importar ficheiro
        </Button>
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full rounded-xl" />)
        ) : (
          <>
            <SummaryMetric
              title="Comissões"
              value={formatCurrency(data.summary.totalCommissionAmount)}
              description={`${data.summary.totalCommissionBaseCount} registos base`}
              icon={Wallet}
            />
            <SummaryMetric
              title="Chargebacks"
              value={formatCurrency(data.summary.totalChargebackAmount)}
              description={`${data.summary.totalChargebackCount} chargeback(s)`}
              icon={TrendingDown}
            />
            <SummaryMetric
              title="Diferencial"
              value={formatCurrency(data.summary.totalDifferentialAmount)}
              description={`${data.summary.totalDifferentialCount} líquido(s)`}
              icon={TrendingUp}
            />
            <SummaryMetric
              title="Não associados"
              value={formatCurrency(data.summary.unmatchedAmount)}
              description={`${data.summary.unmatchedCount} chargeback(s) sem match`}
              icon={AlertTriangle}
            />
          </>
        )}
      </div>

      {isLoading ? (
        <CommissionAnalysisTableSkeleton />
      ) : filteredCommercials.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comerciais</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Header row */}
            <div className="hidden min-w-[860px] sm:grid grid-cols-[1fr_repeat(6,minmax(0,auto))] gap-2 px-4 py-2 border-b text-xs font-medium text-muted-foreground">
              <span>Comercial</span>
              <span className="text-right">Valor a receber €</span>
              <span className="text-right">Base</span>
              <span className="text-right">Chargeback €</span>
              <span className="text-right">Chargebacks qtd</span>
              <span className="text-right">Diferencial €</span>
              <span className="text-right">Diferencial qtd</span>
            </div>
            <Accordion type="multiple" className="min-w-[860px]">
              {filteredCommercials.map((commercial) => (
                <AccordionItem key={commercial.userId} value={commercial.userId} className="border-b last:border-b-0">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 [&>svg]:hidden">
                    <div className="grid w-full grid-cols-[1fr_repeat(6,minmax(0,auto))] gap-2 items-center text-sm">
                      <span className="flex items-center gap-2 font-medium text-foreground text-left">
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]_&]:rotate-180" />
                        {commercial.name}
                        {commercial.fileData.length > 0 && (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {commercial.fileData.length} fich.
                          </span>
                        )}
                      </span>
                      <span className="text-right tabular-nums">{formatCurrency(commercial.commissionAmount)}</span>
                      <span className="text-right tabular-nums">{commercial.commissionBaseCount}</span>
                      <span className="text-right tabular-nums">{formatCurrency(commercial.chargebackAmount)}</span>
                      <span className="text-right tabular-nums">{commercial.chargebackCount}</span>
                      <span className="text-right tabular-nums font-medium text-foreground">{formatCurrency(commercial.differentialAmount)}</span>
                      <span className="text-right tabular-nums">{commercial.differentialCount}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-3 pt-0">
                    <ComparisonSubTable commercial={commercial} />
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
              Ainda não existem dados para os filtros atuais, ou nenhum comercial corresponde à pesquisa.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && data.unmatchedItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Chargebacks não associados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">CPE</TableHead>
                  <TableHead>Empresa (ficheiro)</TableHead>
                  <TableHead className="text-right">Valor €</TableHead>
                  <TableHead className="min-w-[200px]">Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.unmatchedItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs text-foreground">{item.cpe || "—"}</TableCell>
                    <TableCell className="text-sm">{item.fileData?.nomeEmpresa || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(item.chargebackAmount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.unmatchedReason || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ImportChargebacksDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
