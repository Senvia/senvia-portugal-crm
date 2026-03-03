import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { useCommitments } from "@/hooks/useCommitments";
import { useTeamMembers } from "@/hooks/useTeam";
import { useMonthSalesMetrics } from "@/hooks/useMonthSalesMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(val);
}

function formatNumber(val: number) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(val);
}

function formatPercent(actual: number, target: number) {
  if (target === 0) return "—";
  return `${Math.round((actual / target) * 100)}%`;
}

function percentColor(actual: number, target: number) {
  if (target === 0) return "text-muted-foreground";
  const pct = (actual / target) * 100;
  if (pct >= 100) return "text-green-500";
  if (pct >= 50) return "text-amber-500";
  return "text-red-500";
}

interface RowData {
  userId: string;
  name: string;
  nifs: number;
  energia: number;
  solar: number;
  comissao: number;
}

export function SalesPerformancePanel() {
  const { user, profile } = useAuth();
  const { isAdmin } = usePermissions();
  const { data: members = [] } = useTeamMembers();
  const { selectedMemberId } = useTeamFilter();
  const { commitment, isLoading, allCommitments, allLoading } = useCommitments(user?.id);
  const { data: salesMetrics = [], isLoading: salesLoading } = useMonthSalesMetrics();

  const currentMonthLabel = format(startOfMonth(new Date()), "MMMM yyyy", { locale: pt });

  // Build objective rows (for concretização calculation)
  const buildObjectiveRows = (): RowData[] => {
    if (isAdmin) {
      const memberRows = members.map((m) => {
        const mc = allCommitments.find((c) => c.user_id === m.user_id);
        return {
          userId: m.user_id,
          name: m.full_name + (m.user_id === user?.id ? " (eu)" : ""),
          nifs: Number(mc?.total_nifs || 0),
          energia: Number(mc?.total_energia_mwh || 0),
          solar: Number(mc?.total_solar_kwp || 0),
          comissao: Number(mc?.total_comissao || 0),
        };
      });
      if (user?.id && !memberRows.some((r) => r.userId === user.id) && commitment) {
        memberRows.unshift({
          userId: user.id,
          name: (profile?.full_name || "Eu") + " (eu)",
          nifs: Number(commitment.total_nifs || 0),
          energia: Number(commitment.total_energia_mwh || 0),
          solar: Number(commitment.total_solar_kwp || 0),
          comissao: Number(commitment.total_comissao || 0),
        });
      }
      return memberRows;
    }
    return [{
      userId: user?.id || "",
      name: members.find((m) => m.user_id === user?.id)?.full_name || profile?.full_name || "Eu",
      nifs: Number(commitment?.total_nifs || 0),
      energia: Number(commitment?.total_energia_mwh || 0),
      solar: Number(commitment?.total_solar_kwp || 0),
      comissao: Number(commitment?.total_comissao || 0),
    }];
  };

  const allObjRows = buildObjectiveRows();
  const objectiveRows = selectedMemberId ? allObjRows.filter((r) => r.userId === selectedMemberId) : allObjRows;

  const salesRows: RowData[] = objectiveRows.map((obj) => {
    const sm = salesMetrics.find((s) => s.userId === obj.userId);
    return {
      userId: obj.userId,
      name: obj.name,
      nifs: sm?.nifs || 0,
      energia: sm?.energia || 0,
      solar: sm?.solar || 0,
      comissao: sm?.comissao || 0,
    };
  });

  const sumRows = (rows: RowData[]) =>
    rows.reduce((acc, r) => ({
      nifs: acc.nifs + r.nifs, energia: acc.energia + r.energia,
      solar: acc.solar + r.solar, comissao: acc.comissao + r.comissao,
    }), { nifs: 0, energia: 0, solar: 0, comissao: 0 });

  const objTotals = sumRows(objectiveRows);
  const salesTotals = sumRows(salesRows);
  const loading = isLoading || allLoading || salesLoading;

  const SectionLabel = ({ label }: { label: string }) => (
    <TableRow className="bg-muted/30 hover:bg-muted/30">
      <TableCell colSpan={5} className="text-xs font-semibold uppercase tracking-wider py-1.5 text-muted-foreground">
        {label}
      </TableCell>
    </TableRow>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-base capitalize">
            Vendas & Concretização — {currentMonthLabel}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Colaborador</TableHead>
                <TableHead className="text-xs text-right">NIFs</TableHead>
                <TableHead className="text-xs text-right">Energia (MWh)</TableHead>
                <TableHead className="text-xs text-right hidden sm:table-cell">Solar (kWp)</TableHead>
                <TableHead className="text-xs text-right">Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* A) VENDAS */}
              <SectionLabel label="A) Vendas" />
              {salesRows.map((row) => (
                <TableRow key={row.userId}>
                  <TableCell className="text-xs py-1.5 font-medium">{row.name}</TableCell>
                  <TableCell className="text-xs text-right py-1.5">{row.nifs}</TableCell>
                  <TableCell className="text-xs text-right py-1.5">{formatNumber(row.energia)}</TableCell>
                  <TableCell className="text-xs text-right py-1.5 hidden sm:table-cell">{formatNumber(row.solar)}</TableCell>
                  <TableCell className="text-xs text-right py-1.5 font-medium text-green-500">{formatCurrency(row.comissao)}</TableCell>
                </TableRow>
              ))}
              {isAdmin && salesRows.length > 1 && (
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell className="text-xs font-semibold py-1.5">TOTAL</TableCell>
                  <TableCell className="text-xs text-right font-semibold py-1.5">{salesTotals.nifs}</TableCell>
                  <TableCell className="text-xs text-right font-semibold py-1.5">{formatNumber(salesTotals.energia)}</TableCell>
                  <TableCell className="text-xs text-right font-semibold py-1.5 hidden sm:table-cell">{formatNumber(salesTotals.solar)}</TableCell>
                  <TableCell className="text-xs text-right font-semibold py-1.5 text-green-500">{formatCurrency(salesTotals.comissao)}</TableCell>
                </TableRow>
              )}

              {/* B) CONCRETIZAÇÃO */}
              <SectionLabel label="B) Concretização do Objetivo" />
              {salesRows.map((row, i) => {
                const obj = objectiveRows[i];
                return (
                  <TableRow key={row.userId}>
                    <TableCell className="text-xs py-1.5 font-medium">{row.name}</TableCell>
                    <TableCell className={`text-xs text-right py-1.5 ${percentColor(row.nifs, obj.nifs)}`}>{formatPercent(row.nifs, obj.nifs)}</TableCell>
                    <TableCell className={`text-xs text-right py-1.5 ${percentColor(row.energia, obj.energia)}`}>{formatPercent(row.energia, obj.energia)}</TableCell>
                    <TableCell className={`text-xs text-right py-1.5 hidden sm:table-cell ${percentColor(row.solar, obj.solar)}`}>{formatPercent(row.solar, obj.solar)}</TableCell>
                    <TableCell className={`text-xs text-right py-1.5 font-medium ${percentColor(row.comissao, obj.comissao)}`}>{formatPercent(row.comissao, obj.comissao)}</TableCell>
                  </TableRow>
                );
              })}
              {isAdmin && salesRows.length > 1 && (
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell className="text-xs font-semibold py-1.5">TOTAL</TableCell>
                  <TableCell className={`text-xs text-right font-semibold py-1.5 ${percentColor(salesTotals.nifs, objTotals.nifs)}`}>{formatPercent(salesTotals.nifs, objTotals.nifs)}</TableCell>
                  <TableCell className={`text-xs text-right font-semibold py-1.5 ${percentColor(salesTotals.energia, objTotals.energia)}`}>{formatPercent(salesTotals.energia, objTotals.energia)}</TableCell>
                  <TableCell className={`text-xs text-right font-semibold py-1.5 hidden sm:table-cell ${percentColor(salesTotals.solar, objTotals.solar)}`}>{formatPercent(salesTotals.solar, objTotals.solar)}</TableCell>
                  <TableCell className={`text-xs text-right font-semibold py-1.5 ${percentColor(salesTotals.comissao, objTotals.comissao)}`}>{formatPercent(salesTotals.comissao, objTotals.comissao)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
