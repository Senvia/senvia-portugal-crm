import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from '@/hooks/useTeam';
import { useCommissionClosings } from '@/hooks/useCommissionClosings';
import {
  calculateEnergyCommissionPure,
  getVolumeTier,
  type EnergyCommissionConfig,
  type EnergyVolumeTier,
} from '@/hooks/useCommissionMatrix';
import { useOrganization } from '@/hooks/useOrganization';
import { formatCurrency } from '@/lib/format';
import { format, endOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

const TIER_LABELS: Record<string, string> = {
  low: 'Baixo (≤300 MWh)',
  mid: 'Médio (301–600 MWh)',
  high: 'Alto (+601 MWh)',
};

interface CommercialPreview {
  userId: string;
  name: string;
  totalConsumoKwh: number;
  totalConsumoMwh: number;
  tier: EnergyVolumeTier;
  totalIndicativa: number;
  totalFinal: number;
  cpes: Array<{
    sale_id: string;
    proposal_cpe_id: string;
    serial_number: string | null;
    consumo_anual: number;
    margem: number;
    comissao_indicativa: number;
    comissao_final: number;
  }>;
}

interface CloseMonthModalProps {
  month: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloseMonthModal({ month, open, onOpenChange }: CloseMonthModalProps) {
  const { organization } = useAuth();
  const { data: org } = useOrganization();
  const { data: members } = useTeamMembers();
  const { closeMonth } = useCommissionClosings();

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<CommercialPreview[]>([]);
  const [notes, setNotes] = useState('');

  const energyConfig: EnergyCommissionConfig | null = (org as any)?.commission_matrix?.ee_gas ?? null;

  const getMemberName = (userId: string) => {
    const m = members?.find((m: any) => m.user_id === userId);
    return m?.full_name || 'Desconhecido';
  };

  useEffect(() => {
    if (!open || !organization?.id) return;
    loadPreview();
  }, [open, organization?.id, month]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const monthStart = month;
      const monthEnd = format(endOfMonth(new Date(month)), 'yyyy-MM-dd');

      // Get delivered sales for this month with their proposal_id
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('id, lead_id, sale_date, status, proposal_id')
        .eq('organization_id', organization!.id)
        .eq('status', 'delivered')
        .gte('sale_date', monthStart)
        .lte('sale_date', monthEnd);

      if (salesError) throw salesError;
      if (!sales?.length) {
        setPreview([]);
        setLoading(false);
        return;
      }

      // Get lead assigned_to
      const leadIds = [...new Set(sales.map(s => s.lead_id).filter(Boolean))] as string[];
      const { data: leads } = await supabase
        .from('leads')
        .select('id, assigned_to')
        .in('id', leadIds);

      const leadMap = new Map((leads || []).map(l => [l.id, l.assigned_to]));

      // Get proposal_cpes for the proposals linked to these sales
      const proposalIds = [...new Set(sales.map(s => s.proposal_id).filter(Boolean))] as string[];
      if (!proposalIds.length) {
        setPreview([]);
        setLoading(false);
        return;
      }

      // Map proposal_id -> sale_id
      const proposalToSale = new Map<string, string>();
      for (const s of sales) {
        if (s.proposal_id) proposalToSale.set(s.proposal_id, s.id);
      }

      const { data: cpes } = await supabase
        .from('proposal_cpes')
        .select('id, proposal_id, consumo_anual, margem, comissao, serial_number')
        .in('proposal_id', proposalIds);

      if (!cpes?.length) {
        setPreview([]);
        setLoading(false);
        return;
      }

      // Group by commercial
      const byCommercial = new Map<string, CommercialPreview>();

      for (const cpe of cpes) {
        const saleId = proposalToSale.get(cpe.proposal_id);
        if (!saleId) continue;
        const sale = sales.find(s => s.id === saleId);
        if (!sale || !sale.lead_id) continue;
        const assignedTo = leadMap.get(sale.lead_id) || 'unassigned';

        if (!byCommercial.has(assignedTo)) {
          byCommercial.set(assignedTo, {
            userId: assignedTo,
            name: getMemberName(assignedTo),
            totalConsumoKwh: 0,
            totalConsumoMwh: 0,
            tier: 'low',
            totalIndicativa: 0,
            totalFinal: 0,
            cpes: [],
          });
        }

        const entry = byCommercial.get(assignedTo)!;
        const consumo = cpe.consumo_anual || 0;
        entry.totalConsumoKwh += consumo;
        entry.totalIndicativa += cpe.comissao || 0;
        entry.cpes.push({
          sale_id: saleId,
          proposal_cpe_id: cpe.id,
          serial_number: cpe.serial_number,
          consumo_anual: consumo,
          margem: cpe.margem || 0,
          comissao_indicativa: cpe.comissao || 0,
          comissao_final: 0,
        });
      }

      // Recalculate with aggregated volume
      for (const entry of byCommercial.values()) {
        entry.totalConsumoMwh = entry.totalConsumoKwh / 1000;
        entry.tier = getVolumeTier(entry.totalConsumoKwh);
        entry.name = getMemberName(entry.userId);

        let totalFinal = 0;
        for (const cpe of entry.cpes) {
          if (energyConfig && energyConfig.bands.length > 0) {
            const final_ = calculateEnergyCommissionPure(cpe.margem, energyConfig, entry.tier);
            cpe.comissao_final = final_ ?? cpe.comissao_indicativa;
          } else {
            cpe.comissao_final = cpe.comissao_indicativa;
          }
          totalFinal += cpe.comissao_final;
        }
        entry.totalFinal = totalFinal;
      }

      setPreview(Array.from(byCommercial.values()).sort((a, b) => b.totalFinal - a.totalFinal));
    } catch (err) {
      console.error('Error loading preview:', err);
    }
    setLoading(false);
  };

  const totalCommission = preview.reduce((sum, p) => sum + p.totalFinal, 0);

  const handleClose = () => {
    closeMonth.mutate({
      month,
      totalCommission,
      notes: notes || undefined,
      items: preview.map(p => ({
        user_id: p.userId,
        total_consumo_mwh: p.totalConsumoMwh,
        volume_tier: p.tier,
        total_commission: p.totalFinal,
        items_detail: p.cpes,
      })),
    }, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const monthLabel = format(new Date(month), 'MMMM yyyy', { locale: pt });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar Mês — {monthLabel}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4 py-8">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : preview.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Nenhuma venda concluída encontrada neste mês.
          </div>
        ) : (
          <div className="space-y-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Comercial</TableHead>
                  <TableHead className="text-right">MWh Total</TableHead>
                  <TableHead>Patamar</TableHead>
                  <TableHead className="text-right">Comissão Indicativa</TableHead>
                  <TableHead className="text-right">Comissão Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map(p => (
                  <TableRow key={p.userId}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{p.totalConsumoMwh.toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TIER_LABELS[p.tier] || p.tier}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(p.totalIndicativa)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(p.totalFinal)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-bold">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(preview.reduce((s, p) => s + p.totalIndicativa, 0))}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(totalCommission)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observações sobre este fechamento..."
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={handleClose}
            disabled={loading || preview.length === 0 || closeMonth.isPending}
          >
            {closeMonth.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
