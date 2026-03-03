import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { useCommitments } from "@/hooks/useCommitments";
import { useTeamMembers } from "@/hooks/useTeam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { ClipboardList, Pencil, Plus } from "lucide-react";
import { format, startOfMonth } from "date-fns";
import { pt } from "date-fns/locale";
import { EditCommitmentModal } from "./EditCommitmentModal";
import { Skeleton } from "@/components/ui/skeleton";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(val);
}

function formatNumber(val: number) {
  return new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(val);
}

export function CommitmentPanel() {
  const { user, profile } = useAuth();
  const { isAdmin } = usePermissions();
  const { data: members = [] } = useTeamMembers();
  const { selectedMemberId } = useTeamFilter();
  const { commitment, isLoading, allCommitments, allLoading } = useCommitments(user?.id);
  const [editOpen, setEditOpen] = useState(false);

  const currentMonthLabel = format(startOfMonth(new Date()), "MMMM yyyy", { locale: pt });

  // Build rows: admin sees all members, user sees only self
  const buildRows = () => {
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

      // Ensure current user appears even if not in organization_members (e.g. super_admin)
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

  const allRows = buildRows();
  const rows = selectedMemberId
    ? allRows.filter((r) => r.userId === selectedMemberId)
    : allRows;

  const totals = rows.reduce(
    (acc, r) => ({
      nifs: acc.nifs + r.nifs,
      energia: acc.energia + r.energia,
      solar: acc.solar + r.solar,
      comissao: acc.comissao + r.comissao,
    }),
    { nifs: 0, energia: 0, solar: 0, comissao: 0 }
  );

  const loading = isLoading || allLoading;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <CardTitle className="text-base capitalize">
                Compromisso — {currentMonthLabel}
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
            </div>
          ) : rows.every((r) => !r.hasCommitment) ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                Nenhum compromisso definido para este mês.
              </p>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Definir Compromisso
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
                {rows.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell className="text-xs py-2 font-medium">{row.name}</TableCell>
                    <TableCell className="text-xs text-right py-2">{row.nifs}</TableCell>
                    <TableCell className="text-xs text-right py-2">{formatNumber(row.energia)}</TableCell>
                    <TableCell className="text-xs text-right py-2 hidden sm:table-cell">{formatNumber(row.solar)}</TableCell>
                    <TableCell className="text-xs text-right py-2 font-medium text-green-500">{formatCurrency(row.comissao)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {isAdmin && rows.length > 1 && (
                <TableFooter>
                  <TableRow>
                    <TableCell className="text-xs font-semibold py-2">TOTAL</TableCell>
                    <TableCell className="text-xs text-right font-semibold py-2">{totals.nifs}</TableCell>
                    <TableCell className="text-xs text-right font-semibold py-2">{formatNumber(totals.energia)}</TableCell>
                    <TableCell className="text-xs text-right font-semibold py-2 hidden sm:table-cell">{formatNumber(totals.solar)}</TableCell>
                    <TableCell className="text-xs text-right font-semibold py-2 text-green-500">{formatCurrency(totals.comissao)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
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
