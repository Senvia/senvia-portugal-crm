import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, addDays, format, parseISO, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import type { FinanceStats, PaymentWithSale, CashflowPoint } from '@/types/finance';
import type { PaymentMethod, PaymentRecordStatus } from '@/types/sales';

export function useFinanceStats() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  const { data: payments, isLoading } = useQuery({
    queryKey: ['finance-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('sale_payments')
        .select(`
          *,
          sales:sale_id (
            id,
            code,
            total_value,
            leads:lead_id (name),
            crm_clients:client_id (name)
          )
        `)
        .eq('organization_id', organizationId)
        .order('payment_date', { ascending: true });

      if (error) {
        console.error('Error fetching finance stats:', error);
        throw error;
      }

      return (data || []).map((payment): PaymentWithSale => ({
        id: payment.id,
        organization_id: payment.organization_id,
        sale_id: payment.sale_id,
        amount: Number(payment.amount),
        payment_date: payment.payment_date,
        payment_method: payment.payment_method as PaymentMethod | null,
        invoice_reference: payment.invoice_reference,
        status: payment.status as PaymentRecordStatus,
        notes: payment.notes,
        created_at: payment.created_at,
        updated_at: payment.updated_at,
        sale: {
          id: payment.sales?.id || '',
          code: payment.sales?.code || '',
          total_value: Number(payment.sales?.total_value || 0),
        },
        client_name: payment.sales?.crm_clients?.name || null,
        lead_name: payment.sales?.leads?.name || null,
      }));
    },
    enabled: !!organizationId,
  });

  const stats = useMemo((): FinanceStats => {
    if (!payments || payments.length === 0) {
      return {
        totalBilled: 0,
        totalReceived: 0,
        totalPending: 0,
        receivedThisMonth: 0,
        dueSoon: 0,
        dueSoonCount: 0,
        dueSoonPayments: [],
        cashflowTrend: [],
      };
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const next7Days = addDays(now, 7);

    // Totals
    const totalReceived = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalBilled = totalReceived + totalPending;

    // This month received
    const receivedThisMonth = payments
      .filter(p => {
        if (p.status !== 'paid') return false;
        const date = parseISO(p.payment_date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, p) => sum + p.amount, 0);

    // Due in next 7 days (pending payments)
    const dueSoonPayments = payments
      .filter(p => {
        if (p.status !== 'pending') return false;
        const date = parseISO(p.payment_date);
        return isWithinInterval(date, { start: startOfDay(now), end: endOfDay(next7Days) });
      })
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

    const dueSoon = dueSoonPayments.reduce((sum, p) => sum + p.amount, 0);

    // Cashflow trend (last 30 days + next 7 days)
    const trendStart = subDays(now, 30);
    const trendEnd = next7Days;
    const cashflowTrend: CashflowPoint[] = [];

    for (let d = trendStart; d <= trendEnd; d = addDays(d, 1)) {
      const dayStr = format(d, 'yyyy-MM-dd');
      
      const received = payments
        .filter(p => p.status === 'paid' && p.payment_date === dayStr)
        .reduce((sum, p) => sum + p.amount, 0);

      const scheduled = payments
        .filter(p => p.status === 'pending' && p.payment_date === dayStr)
        .reduce((sum, p) => sum + p.amount, 0);

      cashflowTrend.push({
        date: dayStr,
        received,
        scheduled,
      });
    }

    return {
      totalBilled,
      totalReceived,
      totalPending,
      receivedThisMonth,
      dueSoon,
      dueSoonCount: dueSoonPayments.length,
      dueSoonPayments,
      cashflowTrend,
    };
  }, [payments]);

  return {
    stats,
    isLoading,
    payments: payments || [],
  };
}
