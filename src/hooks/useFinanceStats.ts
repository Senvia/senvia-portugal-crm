import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, addDays, format, parseISO, isWithinInterval, subDays, startOfDay, endOfDay } from 'date-fns';
import type { FinanceStats, PaymentWithSale, CashflowPoint } from '@/types/finance';
import type { PaymentMethod, PaymentRecordStatus } from '@/types/sales';
import { DateRange } from 'react-day-picker';

interface UseFinanceStatsOptions {
  dateRange?: DateRange;
}

export function useFinanceStats(options?: UseFinanceStatsOptions) {
  const { organization } = useAuth();
  const organizationId = organization?.id;
  const dateRange = options?.dateRange;

  const { data: payments, isLoading: loadingPayments } = useQuery({
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
        invoice_file_url: payment.invoice_file_url,
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

  // Fetch expenses
  const { data: expenses, isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses-stats', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', organizationId)
        .order('expense_date', { ascending: true });

      if (error) {
        console.error('Error fetching expenses:', error);
        throw error;
      }

      return (data || []).map((e) => ({
        ...e,
        amount: Number(e.amount),
      }));
    },
    enabled: !!organizationId,
  });

  const isLoading = loadingPayments || loadingExpenses;

  // Filter payments by date range
  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    if (!dateRange?.from) return payments;

    return payments.filter(p => {
      const date = parseISO(p.payment_date);
      if (dateRange.from && date < startOfDay(dateRange.from)) return false;
      if (dateRange.to && date > endOfDay(dateRange.to)) return false;
      return true;
    });
  }, [payments, dateRange]);

  // Filter expenses by date range
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    if (!dateRange?.from) return expenses;

    return expenses.filter(e => {
      const date = parseISO(e.expense_date);
      if (dateRange.from && date < startOfDay(dateRange.from)) return false;
      if (dateRange.to && date > endOfDay(dateRange.to)) return false;
      return true;
    });
  }, [expenses, dateRange]);

  const stats = useMemo((): FinanceStats => {
    if ((!filteredPayments || filteredPayments.length === 0) && (!filteredExpenses || filteredExpenses.length === 0)) {
      return {
        totalBilled: 0,
        totalReceived: 0,
        totalPending: 0,
        receivedThisMonth: 0,
        dueSoon: 0,
        dueSoonCount: 0,
        dueSoonPayments: [],
        cashflowTrend: [],
        totalExpenses: 0,
        expensesThisMonth: 0,
        balance: 0,
      };
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const next7Days = addDays(now, 7);

    // Totals based on filtered payments
    const totalReceived = filteredPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalPending = filteredPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const totalBilled = totalReceived + totalPending;

    // This month received (within filtered payments)
    const receivedThisMonth = filteredPayments
      .filter(p => {
        if (p.status !== 'paid') return false;
        const date = parseISO(p.payment_date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, p) => sum + p.amount, 0);

    // Due in next 7 days (pending payments within filtered)
    const dueSoonPayments = filteredPayments
      .filter(p => {
        if (p.status !== 'pending') return false;
        const date = parseISO(p.payment_date);
        return isWithinInterval(date, { start: startOfDay(now), end: endOfDay(next7Days) });
      })
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

    const dueSoon = dueSoonPayments.reduce((sum, p) => sum + p.amount, 0);

    // Expenses totals
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    
    const expensesThisMonth = filteredExpenses
      .filter(e => {
        const date = parseISO(e.expense_date);
        return isWithinInterval(date, { start: monthStart, end: monthEnd });
      })
      .reduce((sum, e) => sum + e.amount, 0);

    // Balance
    const balance = receivedThisMonth - expensesThisMonth;

    // Cashflow trend - use date range if provided, otherwise last 30 days + next 7 days
    const trendStart = dateRange?.from ? startOfDay(dateRange.from) : subDays(now, 30);
    const trendEnd = dateRange?.to ? endOfDay(dateRange.to) : next7Days;
    const cashflowTrend: CashflowPoint[] = [];

    for (let d = trendStart; d <= trendEnd; d = addDays(d, 1)) {
      const dayStr = format(d, 'yyyy-MM-dd');
      
      const received = filteredPayments
        .filter(p => p.status === 'paid' && p.payment_date === dayStr)
        .reduce((sum, p) => sum + p.amount, 0);

      const scheduled = filteredPayments
        .filter(p => p.status === 'pending' && p.payment_date === dayStr)
        .reduce((sum, p) => sum + p.amount, 0);

      const expensesOnDay = filteredExpenses
        .filter(e => e.expense_date === dayStr)
        .reduce((sum, e) => sum + e.amount, 0);

      cashflowTrend.push({
        date: dayStr,
        received,
        scheduled,
        expenses: expensesOnDay,
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
      totalExpenses,
      expensesThisMonth,
      balance,
    };
  }, [filteredPayments, filteredExpenses, dateRange]);

  return {
    stats,
    isLoading,
    payments: filteredPayments,
  };
}
