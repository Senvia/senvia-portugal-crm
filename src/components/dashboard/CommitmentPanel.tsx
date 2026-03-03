import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useCommitments } from "@/hooks/useCommitments";
import { useTeamMembers } from "@/hooks/useTeam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const { data: members = [] } = useTeamMembers();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const effectiveUserId = isAdmin ? (selectedUserId || user?.id) : user?.id;
  const { commitment, isLoading } = useCommitments(effectiveUserId);

  const currentMonthLabel = format(startOfMonth(new Date()), "MMMM yyyy", { locale: pt });

  const totals = commitment?.lines.reduce(
    (acc, l) => ({
      energia: acc.energia + Number(l.energia_mwh || 0),
      solar: acc.solar + Number(l.solar_kwp || 0),
      comissao: acc.comissao + Number(l.comissao || 0),
    }),
    { energia: 0, solar: 0, comissao: 0 }
  ) || { energia: 0, solar: 0, comissao: 0 };

  const isOwnCommitment = effectiveUserId === user?.id;

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
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Select
                  value={effectiveUserId || ""}
                  onValueChange={(v) => setSelectedUserId(v)}
                >
                  <SelectTrigger className="w-[160px] h-8 text-xs">
                    <SelectValue placeholder="Comercial" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.user_id}>
                        {m.full_name}
                        {m.user_id === user?.id ? " (eu)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {isOwnCommitment && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setEditOpen(true)}
                >
                  {commitment ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !commitment || commitment.lines.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">
                Nenhum compromisso definido para este mês.
              </p>
              {isOwnCommitment && (
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Definir Compromisso
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">NIF</TableHead>
                  <TableHead className="text-xs text-right">Energia (MWh)</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Solar (kWp)</TableHead>
                  <TableHead className="text-xs text-right">Comissão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commitment.lines.map((line, i) => (
                  <TableRow key={line.id || i}>
                    <TableCell className="text-xs font-mono py-2">
                      {line.nif}
                      {line.proposal_id && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">Proposta</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-right py-2">{formatNumber(Number(line.energia_mwh))}</TableCell>
                    <TableCell className="text-xs text-right py-2 hidden sm:table-cell">{formatNumber(Number(line.solar_kwp))}</TableCell>
                    <TableCell className="text-xs text-right py-2 font-medium text-green-500">{formatCurrency(Number(line.comissao))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="text-xs font-semibold py-2">TOTAL</TableCell>
                  <TableCell className="text-xs text-right font-semibold py-2">{formatNumber(totals.energia)}</TableCell>
                  <TableCell className="text-xs text-right font-semibold py-2 hidden sm:table-cell">{formatNumber(totals.solar)}</TableCell>
                  <TableCell className="text-xs text-right font-semibold py-2 text-green-500">{formatCurrency(totals.comissao)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </CardContent>
      </Card>

      <EditCommitmentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        existingLines={commitment?.lines || []}
      />
    </>
  );
}
