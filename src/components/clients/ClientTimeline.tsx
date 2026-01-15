import { FileText, ShoppingCart, Calendar, MessageSquare } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ClientHistoryEvent, HistoryEventType } from '@/hooks/useClientHistory';

interface ClientTimelineProps {
  events: ClientHistoryEvent[];
  isLoading?: boolean;
}

const EVENT_CONFIG: Record<HistoryEventType, { icon: typeof FileText; color: string; bgColor: string }> = {
  proposal: {
    icon: FileText,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  sale: {
    icon: ShoppingCart,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  meeting: {
    icon: Calendar,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  note: {
    icon: MessageSquare,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-muted', text: 'text-muted-foreground' },
  sent: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  approved: { bg: 'bg-success/10', text: 'text-success' },
  rejected: { bg: 'bg-destructive/10', text: 'text-destructive' },
  pending: { bg: 'bg-warning/10', text: 'text-warning' },
  completed: { bg: 'bg-success/10', text: 'text-success' },
  cancelled: { bg: 'bg-destructive/10', text: 'text-destructive' },
};

function TimelineItem({ event }: { event: ClientHistoryEvent }) {
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;
  const statusStyle = event.status ? STATUS_STYLES[event.status] || STATUS_STYLES.pending : null;

  return (
    <div className="flex gap-3 pb-6 last:pb-0">
      {/* Icon */}
      <div className="flex flex-col items-center">
        <div className={cn('p-2 rounded-full', config.bgColor)}>
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>
        <div className="flex-1 w-px bg-border mt-2" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-sm">{event.title}</p>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {event.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {event.value !== undefined && event.value > 0 && (
              <span className="text-sm font-semibold text-success">
                {formatCurrency(event.value)}
              </span>
            )}
            {statusStyle && event.status && (
              <Badge variant="outline" className={cn('text-xs', statusStyle.bg, statusStyle.text)}>
                {event.status}
              </Badge>
            )}
          </div>
        </div>
        <time className="text-xs text-muted-foreground mt-1 block">
          {formatDateTime(event.date)}
        </time>
      </div>
    </div>
  );
}

export function ClientTimeline({ events, isLoading }: ClientTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Sem histórico registado</p>
        <p className="text-sm mt-1">Propostas, vendas e reuniões aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {events.map((event) => (
        <TimelineItem key={`${event.type}-${event.id}`} event={event} />
      ))}
    </div>
  );
}
