import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { Calendar, Phone, Users, CheckSquare, RotateCcw, ChevronRight, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isToday, startOfDay, endOfDay, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useMemo } from 'react';
import type { CalendarEvent, EventType } from '@/types/calendar';
import { EVENT_TYPE_LABELS } from '@/types/calendar';

const EVENT_TYPE_ICONS: Record<EventType, React.ElementType> = {
  meeting: Users,
  call: Phone,
  task: CheckSquare,
  follow_up: RotateCcw,
};

export function CalendarAlertsWidget() {
  const navigate = useNavigate();
  const today = useMemo(() => startOfDay(new Date()), []);
  const endRange = useMemo(() => endOfDay(addDays(today, 7)), [today]);

  const { data: events, isLoading } = useCalendarEvents(today, endRange);

  const { todayEvents, upcomingEvents } = useMemo(() => {
    const pending = (events || []).filter(e => e.status === 'pending');
    return {
      todayEvents: pending.filter(e => isToday(new Date(e.start_time))),
      upcomingEvents: pending.filter(e => !isToday(new Date(e.start_time))),
    };
  }, [events]);

  const totalAlerts = todayEvents.length + upcomingEvents.length;

  if (isLoading) {
    return (
      <Card className="col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (totalAlerts === 0) {
    return (
      <Card className="col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Próximos Eventos
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sem eventos nos próximos 7 dias
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderEvent = (event: CalendarEvent, variant: 'today' | 'upcoming') => {
    const Icon = EVENT_TYPE_ICONS[event.event_type as EventType] || Calendar;
    const bgClass = variant === 'today'
      ? 'bg-destructive/5 hover:bg-destructive/10 border-destructive/20'
      : 'bg-blue-500/5 hover:bg-blue-500/10 border-blue-500/20';

    return (
      <button
        key={event.id}
        onClick={() => navigate('/calendar')}
        className={`w-full text-left p-2 rounded-md transition-colors border ${bgClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-sm font-medium truncate">{event.title}</span>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
          <span>{EVENT_TYPE_LABELS[event.event_type as EventType]}</span>
          <span>•</span>
          <span>
            {event.all_day
              ? (variant === 'today' ? 'Hoje, dia inteiro' : format(new Date(event.start_time), "EEE dd/MM", { locale: pt }))
              : format(new Date(event.start_time), variant === 'today' ? "HH:mm" : "EEE dd/MM 'às' HH:mm", { locale: pt })
            }
          </span>
          {event.lead && (
            <>
              <span>•</span>
              <span className="truncate">{event.lead.name}</span>
            </>
          )}
        </div>
      </button>
    );
  };

  return (
    <Card className="col-span-2 lg:col-span-1">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Próximos Eventos
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {totalAlerts}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {todayEvents.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Hoje</span>
              <Badge variant="destructive" className="text-xs ml-auto">
                {todayEvents.length}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {todayEvents.slice(0, 3).map(e => renderEvent(e, 'today'))}
            </div>
          </div>
        )}

        {upcomingEvents.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-blue-500">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">Próximos 7 dias</span>
              <Badge variant="outline" className="text-xs ml-auto border-blue-500/50 text-blue-500">
                {upcomingEvents.length}
              </Badge>
            </div>
            {todayEvents.length === 0 && (
              <div className="space-y-1.5">
                {upcomingEvents.slice(0, 3).map(e => renderEvent(e, 'upcoming'))}
              </div>
            )}
          </div>
        )}

        {totalAlerts > 3 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => navigate('/calendar')}
          >
            Ver agenda ({totalAlerts})
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
