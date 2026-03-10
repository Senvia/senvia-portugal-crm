import { useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { useTeamMembers } from "@/hooks/useTeam";
import { useDashboardPeriod } from "@/stores/useDashboardPeriod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users } from "lucide-react";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { pt } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { PrintCardButton } from "./PrintCardButton";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(val);
}

interface MemberPerformance {
  userId: string;
  name: string;
  leads: number;
  proposals: number;
  openProposalValue: number;
  salesDelivered: number;
  commission: number;
  conversionRate: number;
}

export function TeamPerformanceTable() {
  const { user, profile, organization } = useAuth();
  const { data: members = [] } = useTeamMembers();
  const { selectedMemberId, canFilterByTeam, isTeamLeader, teamMemberIds, dataScope } = useTeamFilter();
  const { selectedMonth } = useDashboardPeriod();
  const cardRef = useRef<HTMLDivElement>(null);

  const orgId = organization?.id;
  const monthStart = startOfMonth(selectedMonth).toISOString();
  const monthEnd = endOfMonth(selectedMonth).toISOString();
  const currentMonthLabel = format(startOfMonth(selectedMonth), "MMMM yyyy", { locale: pt });

  const allMemberList = members.length > 0
    ? members.filter(m => !m.is_banned)
    : (user?.id ? [{ user_id: user.id, full_name: profile?.full_name || "Eu" }] : []);

  const filteredMembers = useMemo(() => {
    if (dataScope === 'own' || !canFilterByTeam) {
      return allMemberList.filter(m => m.user_id === user?.id);
    }
    if (selectedMemberId) {
      return allMemberList.filter(m => m.user_id === selectedMemberId);
    }
    if (dataScope === 'team' && isTeamLeader) {
      const allowed = new Set([user?.id, ...teamMemberIds].filter(Boolean));
      return allMemberList.filter(m => allowed.has(m.user_id));
    }
    return allMemberList;
  }, [allMemberList, dataScope, canFilterByTeam, selectedMemberId, isTeamLeader, teamMemberIds, user?.id]);

  const memberIds = filteredMembers.map(m => m.user_id);

  // Fetch leads count per member
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['team-perf-leads', orgId, monthStart, memberIds],
    queryFn: async () => {
      if (!orgId || memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from('leads')
        .select('assigned_to')
        .eq('organization_id', orgId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)
        .in('assigned_to', memberIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && memberIds.length > 0,
  });

  // Fetch proposals per member
  const { data: proposalsData, isLoading: proposalsLoading } = useQuery({
    queryKey: ['team-perf-proposals', orgId, monthStart, memberIds],
    queryFn: async () => {
      if (!orgId || memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from('proposals')
        .select('created_by, total_value, status')
        .eq('organization_id', orgId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)
        .in('created_by', memberIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && memberIds.length > 0,
  });

  // Fetch sales per member
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['team-perf-sales', orgId, monthStart, memberIds],
    queryFn: async () => {
      if (!orgId || memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from('sales')
        .select('created_by, status, comissao')
        .eq('organization_id', orgId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)
        .in('created_by', memberIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId && memberIds.length > 0,
  });

  const loading = leadsLoading || proposalsLoading || salesLoading;

  const rows: MemberPerformance[] = useMemo(() => {
    return filteredMembers.map((m) => {
      const memberLeads = (leadsData || []).filter(l => l.assigned_to === m.user_id).length;
      const memberProposals = (proposalsData || []).filter(p => p.created_by === m.user_id);
      const openProposalValue = memberProposals
        .filter(p => p.status === 'pending' || p.status === 'sent')
        .reduce((sum, p) => sum + (p.total_value || 0), 0);
      const memberSales = (salesData || []).filter(s => s.created_by === m.user_id);
      const delivered = memberSales.filter(s => s.status === 'delivered' || s.status === 'completed');
      const commission = delivered.reduce((sum, s) => sum + (s.comissao || 0), 0);
      const conversionRate = memberLeads > 0 ? (delivered.length / memberLeads) * 100 : 0;

      return {
        userId: m.user_id,
        name: m.full_name + (m.user_id === user?.id ? " (eu)" : ""),
        leads: memberLeads,
        proposals: memberProposals.length,
        openProposalValue,
        salesDelivered: delivered.length,
        commission,
        conversionRate,
      };
    });
  }, [filteredMembers, leadsData, proposalsData, salesData, user?.id]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        leads: acc.leads + r.leads,
        proposals: acc.proposals + r.proposals,
        openProposalValue: acc.openProposalValue + r.openProposalValue,
        salesDelivered: acc.salesDelivered + r.salesDelivered,
        commission: acc.commission + r.commission,
      }),
      { leads: 0, proposals: 0, openProposalValue: 0, salesDelivered: 0, commission: 0 }
    );
  }, [rows]);

  const totalConversion = totals.leads > 0 ? (totals.salesDelivered / totals.leads) * 100 : 0;
  const showTotals = rows.length > 1;

  return (
    <Card ref={cardRef}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base capitalize">
              Performance da Equipa — {currentMonthLabel}
            </CardTitle>
          </div>
          <PrintCardButton targetRef={cardRef} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Colaborador</TableHead>
                  <TableHead className="text-xs text-right">Leads</TableHead>
                  <TableHead className="text-xs text-right">Propostas</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Valor Prop. Abertas</TableHead>
                  <TableHead className="text-xs text-right">Vendas</TableHead>
                  <TableHead className="text-xs text-right hidden sm:table-cell">Comissão</TableHead>
                  <TableHead className="text-xs text-right">Conversão</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.userId}>
                    <TableCell className="text-xs py-1.5 font-medium">{row.name}</TableCell>
                    <TableCell className="text-xs text-right py-1.5">{row.leads}</TableCell>
                    <TableCell className="text-xs text-right py-1.5">{row.proposals}</TableCell>
                    <TableCell className="text-xs text-right py-1.5 hidden sm:table-cell">{formatCurrency(row.openProposalValue)}</TableCell>
                    <TableCell className="text-xs text-right py-1.5">{row.salesDelivered}</TableCell>
                    <TableCell className="text-xs text-right py-1.5 hidden sm:table-cell text-green-500 font-medium">{formatCurrency(row.commission)}</TableCell>
                    <TableCell className="text-xs text-right py-1.5 font-medium">
                      <span className={row.conversionRate >= 50 ? "text-green-500" : row.conversionRate >= 25 ? "text-amber-500" : "text-red-500"}>
                        {row.conversionRate.toFixed(0)}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {showTotals && (
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableCell className="text-xs font-semibold py-1.5">TOTAL</TableCell>
                    <TableCell className="text-xs text-right font-semibold py-1.5">{totals.leads}</TableCell>
                    <TableCell className="text-xs text-right font-semibold py-1.5">{totals.proposals}</TableCell>
                    <TableCell className="text-xs text-right font-semibold py-1.5 hidden sm:table-cell">{formatCurrency(totals.openProposalValue)}</TableCell>
                    <TableCell className="text-xs text-right font-semibold py-1.5">{totals.salesDelivered}</TableCell>
                    <TableCell className="text-xs text-right font-semibold py-1.5 hidden sm:table-cell text-green-500">{formatCurrency(totals.commission)}</TableCell>
                    <TableCell className="text-xs text-right font-semibold py-1.5">
                      <span className={totalConversion >= 50 ? "text-green-500" : totalConversion >= 25 ? "text-amber-500" : "text-red-500"}>
                        {totalConversion.toFixed(0)}%
                      </span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
