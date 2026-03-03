import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { useCommitments } from "@/hooks/useCommitments";
import { useTeamMembers } from "@/hooks/useTeam";
import { useMonthSalesMetrics } from "@/hooks/useMonthSalesMetrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Target, Pencil, Plus } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { EditCommitmentModal } from "./EditCommitmentModal";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(val);
}

function formatNumber(val: number) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(val);
}

function formatPercent(actual: number, target: number) {
  if (target === 0) return "—";
  const pct = (actual / target) * 100;
  return `${Math.round(pct)}%`;
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
  hasCommitment: boolean;
}

export function CommitmentPanel() {
  const { user, profile } = useAuth();
  const { isAdmin } = usePermissions();
  const { data: members = [] } = useTeamMembers();
  const { selectedMemberId } = useTeamFilter();
  const { commitment, isLoading, allCommitments, allLoading } = useCommitments(user?.id);
  const { data: salesMetrics = [], isLoading: salesLoading } = useMonthSalesMetrics();
  const [editOpen, setEditOpen] = useState(false);

  const currentMonthLabel = format(startOfMonth(new Date()), "MMMM yyyy", { locale: pt });

  // Build objective rows from commitments
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
          hasCommitment: !!mc,
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
          hasCommitment: true,
        });
      }

      return memberRows;
    }

    return [
      {
        userId: user?.id || "",
        name: members.find((m) => m.user_id === user?.id)?.full_name || profile?.full_name || "Eu",
        nifs: Number(commitment?.total_nifs || 0),
        energia: Number(commitment?.total_energia_mwh || 0),
        solar: Number(commitment?.total_solar_kwp || 0),
        comissao: Number(commitment?.total_comissao || 0),
        hasCommitment: !!commitment,
      },
    ];
  };

  // Build sales rows from real data
  const buildSalesRows = (objectiveRows: RowData[]): RowData[] => {
    return objectiveRows.map((obj) => {
      const sm = salesMetrics.find((s) => s.userId === obj.userId);
      return {
        userId: obj.userId,
        name: obj.name,
        nifs: sm?.nifs || 0,
        energia: sm?.energia || 0,
        solar: sm?.solar || 0,
        comissao: sm?.comissao || 0,
        hasCommitment: true,
      };
    });
  };

  const allObjectiveRows = buildObjectiveRows();
  const objectiveRows = selectedMemberId
    ? allObjectiveRows.filter((r) => r.userId === selectedMemberId)
    : allObjectiveRows;

  const salesRows = buildSalesRows(objectiveRows);

  const sumRows = (rows: RowData[]) =>
    rows.reduce(
      (acc, r) => ({
        nifs: acc.nifs + r.nifs,
        energia: acc.energia + r.energia,
        solar: acc.solar + r.solar,
        comissao: acc.comissao + r.comissao,
      }),
      { nifs: 0, energia: 0, solar: 0, comissao: 0 }
    );

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

  const DataRows = ({ rows, isConcretizacao, objRows }: { rows: RowData[]; isConcretizacao?: boolean; objRows?: RowData[] }) => (
    <>
      {rows.map((row, i) => {
        const obj = objRows?.[i];
        return (
          <TableRow key={row.userId}>
            <TableCell className="text-xs py-1.5 font-medium">{row.name}</TableCell>
            <TableCell className={`text-xs text-right py-1.5 ${isConcretizacao && obj ? percentColor(row.nifs, obj.nifs) : ""}`}>
              {isConcretizacao && obj ? formatPercent(row.nifs, obj.nifs) : row.nifs}
            </TableCell>
            <TableCell className={`text-xs text-right py-1.5 ${isConcretizacao && obj ? percentColor(row.energia, obj.energia) : ""}`}>
              {isConcretizacao && obj ? formatPercent(row.energia, obj.energia) : formatNumber(row.energia)}
            </TableCell>
            <TableCell className={`text-xs text-right py-1.5 hidden sm:table-cell ${isConcretizacao && obj ? percentColor(row.solar, obj.solar) : ""}`}>
              {isConcretizacao && obj ? formatPercent(row.solar, obj.solar) : formatNumber(row.solar)}
            </TableCell>
            <TableCell className={`text-xs text-right py-1.5 font-medium ${isConcretizacao && obj ? percentColor(row.comissao, obj.comissao) : "text-green-500"}`}>
              {isConcretizacao && obj ? formatPercent(row.comissao, obj.comissao) : formatCurrency(row.comissao)}
            </TableCell>
          </TableRow>
        );
      })}
    </>
  );

  const TotalRow = ({ totals, isConcretizacao, objTotals: ot }: { totals: { nifs: number; energia: number; solar: number; comissao: number }; isConcretizacao?: boolean; objTotals?: typeof objTotals }) => (
    <TableRow className="bg-muted/20 hover:bg-muted/20">
      <TableCell className="text-xs font-semibold py-1.5">TOTAL</TableCell>
      <TableCell className={`text-xs text-right font-semibold py-1.5 ${isConcretizacao && ot ? percentColor(totals.nifs, ot.nifs) : ""}`}>
        {isConcretizacao && ot ? formatPercent(totals.nifs, ot.nifs) : totals.nifs}
      </TableCell>
      <TableCell className={`text-xs text-right font-semibold py-1.5 ${isConcretizacao && ot ? percentColor(totals.energia, ot.energia) : ""}`}>
        {isConcretizacao && ot ? formatPercent(totals.energia, ot.energia) : formatNumber(totals.energia)}
      </TableCell>
      <TableCell className={`text-xs text-right font-semibold py-1.5 hidden sm:table-cell ${isConcretizacao && ot ? percentColor(totals.solar, ot.solar) : ""}`}>
        {isConcretizacao && ot ? formatPercent(totals.solar, ot.solar) : formatNumber(totals.solar)}
      </TableCell>
      <TableCell className={`text-xs text-right font-semibold py-1.5 ${isConcretizacao && ot ? percentColor(totals.comissao, ot.comissao) : "text-green-500"}`}>
        {isConcretizacao && ot ? formatPercent(totals.comissao, ot.comissao) : formatCurrency(totals.comissao)}
      </TableCell>
    </TableRow>
  );

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-base capitalize">
                Objetivo Mensal — {currentMonthLabel}
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditOpen(true)}
            >
              {commitment ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : objectiveRows.every((r) => !r.hasCommitment) ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                Nenhum objetivo definido para este mês.
              </p>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Definir Objetivo
              </Button>
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
                {/* A) OBJETIVO */}
                <SectionLabel label="A) Objetivo" />
                <DataRows rows={objectiveRows} />
                {isAdmin && objectiveRows.length > 1 && (
                  <TotalRow totals={objTotals} />
                )}

                {/* B) VENDAS */}
                <SectionLabel label="B) Vendas" />
                <DataRows rows={salesRows} />
                {isAdmin && salesRows.length > 1 && (
                  <TotalRow totals={salesTotals} />
                )}

                {/* C) CONCRETIZAÇÃO */}
                <SectionLabel label="C) Concretização" />
                <DataRows rows={salesRows} isConcretizacao objRows={objectiveRows} />
                {isAdmin && salesRows.length > 1 && (
                  <TotalRow totals={salesTotals} isConcretizacao objTotals={objTotals} />
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditCommitmentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        existing={commitment ? {
          total_nifs: Number(commitment.total_nifs),
          total_energia_mwh: Number(commitment.total_energia_mwh),
          total_solar_kwp: Number(commitment.total_solar_kwp),
          total_comissao: Number(commitment.total_comissao),
        } : null}
      />
    </>
  );
}
