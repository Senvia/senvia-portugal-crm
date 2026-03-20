import { useState } from "react";
import { Users, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useOrgAbsences, useOrgVacationBalances, useUpdateVacationBalance, type RhAbsence } from "@/hooks/useRhAbsences";
import { useAuth } from "@/contexts/AuthContext";
import RhAbsenceCard from "./RhAbsenceCard";
import RhAbsenceApprovalDialog from "./RhAbsenceApprovalDialog";

export default function RhAdminPanel() {
  const { organization } = useAuth();
  const { data: absences = [] } = useOrgAbsences();
  const { data: balances = [] } = useOrgVacationBalances();
  const updateBalance = useUpdateVacationBalance();

  const [approvalAbsence, setApprovalAbsence] = useState<RhAbsence | null>(null);
  const [approvalMode, setApprovalMode] = useState<"approve" | "reject">("approve");
  const [showBalanceDialog, setShowBalanceDialog] = useState(false);
  const [editBalance, setEditBalance] = useState<{ userId: string; userName: string; totalDays: number } | null>(null);

  const pendingAbsences = absences.filter(a => a.status === "pending");
  const currentYear = new Date().getFullYear();

  const handleSaveBalance = async () => {
    if (!editBalance || !organization?.id) return;
    await updateBalance.mutateAsync({
      organizationId: organization.id,
      userId: editBalance.userId,
      year: currentYear,
      totalDays: editBalance.totalDays,
    });
    setEditBalance(null);
    setShowBalanceDialog(false);
  };

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Pedidos da Equipa
            {pendingAbsences.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                {pendingAbsences.length} pendente{pendingAbsences.length !== 1 ? "s" : ""}
              </span>
            )}
          </h3>
          <Button variant="outline" size="sm" onClick={() => setShowBalanceDialog(true)}>
            <Settings2 className="h-4 w-4 mr-2" /> Gerir Saldos
          </Button>
        </div>

        {pendingAbsences.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Sem pedidos pendentes de aprovação.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pendingAbsences.map(absence => (
              <RhAbsenceCard
                key={absence.id}
                absence={absence}
                showUser
                isAdmin
                onApprove={() => { setApprovalAbsence(absence); setApprovalMode("approve"); }}
                onReject={() => { setApprovalAbsence(absence); setApprovalMode("reject"); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Approval Dialog */}
      <RhAbsenceApprovalDialog
        open={!!approvalAbsence}
        onOpenChange={(v) => { if (!v) setApprovalAbsence(null); }}
        absence={approvalAbsence}
        mode={approvalMode}
      />

      {/* Balance Management Dialog */}
      <Dialog open={showBalanceDialog} onOpenChange={setShowBalanceDialog}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Saldos de Férias — {currentYear}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {balances.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum saldo configurado. Adicione saldos para os membros da equipa.
              </p>
            ) : (
              (balances as any[]).map((b) => (
                <Card key={b.id} className="bg-secondary/30">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{b.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.total_days} totais · {b.used_days} utilizados · {b.total_days - b.used_days} disponíveis
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setEditBalance({ userId: b.user_id, userName: b.user_name, totalDays: b.total_days })}>
                      Editar
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Balance Dialog */}
      <Dialog open={!!editBalance} onOpenChange={(v) => { if (!v) setEditBalance(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Saldo — {editBalance?.userName}</DialogTitle>
          </DialogHeader>
          <div>
            <label className="block text-sm font-medium mb-1.5">Dias totais de férias</label>
            <Input
              type="number"
              value={editBalance?.totalDays || 22}
              onChange={(e) => setEditBalance(prev => prev ? { ...prev, totalDays: Number(e.target.value) } : null)}
              min={0}
              max={50}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditBalance(null)}>Cancelar</Button>
            <Button onClick={handleSaveBalance} disabled={updateBalance.isPending}>
              {updateBalance.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
