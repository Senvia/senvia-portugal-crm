import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

export type HistoryEventType = 'proposal' | 'sale' | 'meeting' | 'note';

export interface ClientHistoryEvent {
  id: string;
  type: HistoryEventType;
  title: string;
  description?: string;
  date: string;
  value?: number;
  status?: string;
  metadata?: Record<string, unknown>;
}

export function useClientProposals(clientId: string | null) {
  return useQuery({
    queryKey: ['client-proposals', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching client proposals:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!clientId,
  });
}

export function useClientSales(clientId: string | null) {
  return useQuery({
    queryKey: ['client-sales', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching client sales:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!clientId,
  });
}

export function useClientEvents(clientId: string | null) {
  return useQuery({
    queryKey: ['client-events', clientId],
    queryFn: async () => {
      if (!clientId) return [];

      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('client_id', clientId)
        .order('start_time', { ascending: false });

      if (error) {
        console.error('Error fetching client events:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!clientId,
  });
}

export function useClientHistory(clientId: string | null) {
  const { data: proposals = [], isLoading: loadingProposals } = useClientProposals(clientId);
  const { data: sales = [], isLoading: loadingSales } = useClientSales(clientId);
  const { data: events = [], isLoading: loadingEvents } = useClientEvents(clientId);

  const timeline = useMemo(() => {
    const items: ClientHistoryEvent[] = [];

    // Add proposals
    proposals.forEach((p) => {
      items.push({
        id: p.id,
        type: 'proposal',
        title: `Proposta #${p.id.slice(0, 8)}`,
        description: p.notes || undefined,
        date: p.created_at || '',
        value: p.total_value,
        status: p.status,
        metadata: { proposalId: p.id },
      });
    });

    // Add sales
    sales.forEach((s) => {
      items.push({
        id: s.id,
        type: 'sale',
        title: `Venda #${s.id.slice(0, 8)}`,
        description: s.notes || undefined,
        date: s.created_at || '',
        value: s.total_value,
        status: s.status,
        metadata: { saleId: s.id },
      });
    });

    // Add events/meetings
    events.forEach((e) => {
      items.push({
        id: e.id,
        type: 'meeting',
        title: e.title,
        description: e.description || undefined,
        date: e.start_time,
        status: e.status || undefined,
        metadata: { eventId: e.id, eventType: e.event_type },
      });
    });

    // Sort by date descending
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [proposals, sales, events]);

  return {
    timeline,
    proposals,
    sales,
    events,
    isLoading: loadingProposals || loadingSales || loadingEvents,
  };
}
