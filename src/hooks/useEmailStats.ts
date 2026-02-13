import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format } from 'date-fns';

type Period = '7d' | '30d' | '90d';

function getPeriodStart(period: Period): string {
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  return subDays(new Date(), days).toISOString();
}

export function useEmailStats(period: Period = '30d') {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['email-stats', organizationId, period],
    queryFn: async () => {
      if (!organizationId) return null;

      const periodStart = getPeriodStart(period);

      const { data, error } = await supabase
        .from('email_sends')
        .select('status, sent_at, opened_at, clicked_at, created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', periodStart);

      if (error) throw error;

      const total = data.length;
      const sent = data.filter(d => d.status === 'sent').length;
      const failed = data.filter(d => d.status === 'failed').length;
      const opened = data.filter(d => d.opened_at).length;
      const clicked = data.filter(d => d.clicked_at).length;

      // Group by day for chart
      const dailyMap = new Map<string, { sent: number; failed: number; opened: number; clicked: number }>();
      
      data.forEach(item => {
        const day = format(new Date(item.created_at), 'yyyy-MM-dd');
        if (!dailyMap.has(day)) {
          dailyMap.set(day, { sent: 0, failed: 0, opened: 0, clicked: 0 });
        }
        const entry = dailyMap.get(day)!;
        if (item.status === 'sent') entry.sent++;
        if (item.status === 'failed') entry.failed++;
        if (item.opened_at) entry.opened++;
        if (item.clicked_at) entry.clicked++;
      });

      const daily = Array.from(dailyMap.entries())
        .map(([date, counts]) => ({ date, ...counts }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        total,
        sent,
        failed,
        opened,
        clicked,
        openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
        daily,
      };
    },
    enabled: !!organizationId,
  });
}
