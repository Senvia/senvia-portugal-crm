import { useMemo, useState } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import { pt } from "date-fns/locale";
import { FileSearch, FileUp, Search, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TeamMemberFilter } from "@/components/dashboard/TeamMemberFilter";
import { ImportChargebacksDialog } from "@/components/finance/ImportChargebacksDialog";
import { useCommissionAnalysis } from "@/hooks/useCommissionAnalysis";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { formatCurrency, formatDateTime } from "@/lib/format";
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
            Comissões atuais, chargebacks importados por CPE e diferencial por comercial.
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

        <div className="relative w-full xl:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar comercial"
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-5">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-32 w-full rounded-xl" />)
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Comissões</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(data.summary.totalCommissionAmount)}</div>
                <p className="text-xs text-muted-foreground">{data.summary.totalCommissionBaseCount} registos base</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Chargebacks</CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(data.summary.totalChargebackAmount)}</div>
                <p className="text-xs text-muted-foreground">{data.summary.totalChargebackCount} chargeback(s)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Diferencial</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{formatCurrency(data.summary.totalDifferentialAmount)}</div>
                <p className="text-xs text-muted-foreground">{data.summary.totalDifferentialCount} líquido(s)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Imports</CardTitle>
                <FileUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{data.summary.totalImports}</div>
                <p className="text-xs text-muted-foreground">
                  {data.summary.lastImportAt ? `Último: ${formatDateTime(data.summary.lastImportAt)}` : "Sem importações"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sem match</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{data.summary.unmatchedCount}</div>
                <p className="text-xs text-muted-foreground">{formatCurrency(data.summary.unmatchedAmount)}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-56 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredCommercials.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredCommercials.map((commercial) => (
            <Card key={commercial.userId} className="overflow-hidden">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{commercial.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Resumo individual de comissão e chargeback</p>
                  </div>
                  <Badge variant="outline">{commercial.chargebackCount} chargeback(s)</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 p-4 sm:grid-cols-2">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Comissão</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(commercial.commissionAmount)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Base: {commercial.commissionBaseCount} item(ns)</p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Chargeback</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(commercial.chargebackAmount)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Quantidade: {commercial.chargebackCount}</p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Diferencial €</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{formatCurrency(commercial.differentialAmount)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Comissão - chargeback</p>
                </div>

                <div className="rounded-lg border bg-card p-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Diferencial quantidade</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{commercial.differentialCount}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Base - chargebacks</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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

      {data.imports.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas importações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.imports.slice(0, 5).map((importItem) => (
              <div key={importItem.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{importItem.file_name}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(importItem.created_at)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:flex sm:flex-wrap sm:justify-end">
                  <Badge variant="secondary">{importItem.chargeback_count} linhas</Badge>
                  <Badge variant="secondary">{formatCurrency(importItem.total_chargeback_amount || 0)}</Badge>
                  <Badge variant="outline">{importItem.matched_rows} match</Badge>
                  <Badge variant="outline">{importItem.unmatched_rows} sem match</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <ImportChargebacksDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
