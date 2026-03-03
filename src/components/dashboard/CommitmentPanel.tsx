import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useCommitments } from "@/hooks/useCommitments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Pencil, Plus } from "lucide-react";
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
  const { commitment, isLoading } = useCommitments(user?.id);
  const [editOpen, setEditOpen] = useState(false);

  const currentMonthLabel = format(startOfMonth(new Date()), "MMMM yyyy", { locale: pt });

  const nifs = Number(commitment?.total_nifs || 0);
  const energia = Number(commitment?.total_energia_mwh || 0);
  const solar = Number(commitment?.total_solar_kwp || 0);
  const comissao = Number(commitment?.total_comissao || 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-base capitalize">
                Compromisso — {currentMonthLabel}
              </CardTitle>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)}>
              {commitment ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !commitment ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Nenhum compromisso definido para este mês.</p>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Plus className="h-4 w-4 mr-1" /> Definir Compromisso
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">NIFs</p>
                <p className="text-lg font-semibold">{nifs}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Energia (MWh)</p>
                <p className="text-lg font-semibold">{formatNumber(energia)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Solar (kWp)</p>
                <p className="text-lg font-semibold">{formatNumber(solar)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Comissão</p>
                <p className="text-lg font-semibold text-green-500">{formatCurrency(comissao)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EditCommitmentModal
        open={editOpen}
        onOpenChange={setEditOpen}
        existing={commitment ? {
          total_nifs: nifs,
          total_energia_mwh: energia,
          total_solar_kwp: solar,
          total_comissao: comissao,
        } : null}
      />
    </>
  );
}
