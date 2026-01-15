import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface LeadEvent {
  id: string;
  title: string;
  start_time: string;
  event_type: string;
  lead_id: string;
}

export function useLeadEvents() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['lead-events', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return {};

      // Include events from the start of today (even if time has passed)
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('calendar_events')
        .select('id, title, start_time, event_type, lead_id')
        .eq('organization_id', organization.id)
        .not('lead_id', 'is', null)
        .neq('status', 'cancelled')
        .neq('status', 'completed')
        .gte('start_time', startOfToday.toISOString())
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching lead events:', error);
        throw error;
      }

      // Group events by lead_id, keeping only the first (earliest) event per lead
      const eventsByLead: Record<string, LeadEvent> = {};
      
      for (const event of data || []) {
        if (event.lead_id && !eventsByLead[event.lead_id]) {
          eventsByLead[event.lead_id] = event as LeadEvent;
        }
      }

      return eventsByLead;
    },
    enabled: !!organization?.id,
  });
}
