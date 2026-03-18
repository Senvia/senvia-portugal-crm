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
import { useCommissionAnalysis, type CommissionAnalysisCommercial } from "@/hooks/useCommissionAnalysis";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { formatCurrency } from "@/lib/format";
import { normalizeString } from "@/lib/utils";

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
            Vista compacta por comercial para comparar comissão, chargeback e diferencial.
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
                    {commercial.cpes.length > 0 ? (
                      <div className="rounded-md border bg-muted/30 overflow-hidden">
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
                    ) : (
                      <p className="text-xs text-muted-foreground py-2">Sem CPEs associados a este comercial.</p>
                    )}
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
              Ainda não existem chargebacks associados para os filtros atuais, ou nenhum comercial corresponde à pesquisa.
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
                  <TableHead className="text-right">Valor €</TableHead>
                  <TableHead className="min-w-[200px]">Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.unmatchedItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-mono text-xs text-foreground">{item.cpe || "—"}</TableCell>
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
