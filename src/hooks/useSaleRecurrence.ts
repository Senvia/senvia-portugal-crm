import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ServiceStatus = 'pending' | 'active' | 'paused' | 'inactive' | 'cancelled';
export type BillingStatus = 'not_started' | 'current' | 'past_due' | 'uncollectible';
export type CycleStatus = 'pending' | 'paid' | 'failed' | 'void';

export interface RecurrenceCycle {
  id: string;
  period_start: string;
  period_end: string;
  due_date: string;
  amount: number;
  status: CycleStatus;
  stripe_invoice_id: string | null;
  paid_at: string | null;
  failure_reason: string | null;
}

export interface SaleRecurrenceDetail {
  id: string;
  sale_id: string;
  organization_id: string;
  amount: number;
  anchor_date: string;
  service_status: ServiceStatus;
  billing_status: BillingStatus;
  billing_provider: 'manual' | 'stripe';
  next_cycle_date: string | null;
  last_cycle_date: string | null;
  stripe_subscription_id: string | null;
  stripe_checkout_session_id: string | null;
  cycles: RecurrenceCycle[];
}

const RECURRENCE_FIELDS =
  'id, sale_id, organization_id, amount, anchor_date, service_status, billing_status, billing_provider, next_cycle_date, last_cycle_date, stripe_subscription_id, stripe_checkout_session_id';

const CYCLE_FIELDS =
  'id, period_start, period_end, due_date, amount, status, stripe_invoice_id, paid_at, failure_reason';

/** Detalhe da recorrência de uma venda, com o histórico de ciclos. */
export function useSaleRecurrence(saleId: string | null | undefined) {
  return useQuery({
    queryKey: ['sale-recurrence', saleId],
    queryFn: async (): Promise<SaleRecurrenceDetail | null> => {
      if (!saleId) return null;

      const { data: recurrence, error } = await supabase
        .from('sale_recurrences')
        .select(RECURRENCE_FIELDS)
        .eq('sale_id', saleId)
        // Uma venda pode ter recorrências encerradas no histórico; a que
        // interessa é a mais recente.
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!recurrence) return null;

      const { data: cycles, error: cyclesError } = await supabase
        .from('sale_recurring_cycles')
        .select(CYCLE_FIELDS)
        .eq('recurrence_id', recurrence.id)
        .order('period_start', { ascending: false });
      if (cyclesError) throw cyclesError;

      return {
        ...(recurrence as Omit<SaleRecurrenceDetail, 'cycles'>),
        cycles: (cycles ?? []) as RecurrenceCycle[],
      };
    },
    enabled: !!saleId,
  });
}

interface CheckoutResponse {
  checkoutUrl?: string;
  expiresAt?: string | null;
  error?: string;
}

/**
 * Gera (ou regenera) o link de Checkout da recorrência.
 *
 * Regenerar não cria outra recorrência — substitui apenas a sessão guardada.
 */
export function useSaleCheckout() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (recurrenceId: string): Promise<string> => {
      const { data, error } = await supabase.functions.invoke<CheckoutResponse>(
        'stripe-sale-checkout',
        { body: { recurrenceId } },
      );
      if (error) throw new Error(data?.error ?? error.message);
      if (data?.error) throw new Error(data.error);
      if (!data?.checkoutUrl) throw new Error('O Stripe não devolveu um link de pagamento');
      return data.checkoutUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sale-recurrence'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Não foi possível gerar o link de pagamento');
    },
  });

  return {
    createCheckout: mutation.mutateAsync,
    isCreating: mutation.isPending,
  };
}
