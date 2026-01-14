import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, getHours, getMinutes } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { CalendarEvent } from '@/types/calendar';
import { EVENT_TYPE_COLORS } from '@/types/calendar';

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({ currentDate, events, onDayClick, onEventClick }: WeekViewProps) {
  const days = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.start_time), day));
  };

  const getEventPosition = (event: CalendarEvent) => {
    const startDate = new Date(event.start_time);
    const startHour = getHours(startDate);
    const startMinute = getMinutes(startDate);
    const top = (startHour + startMinute / 60) * 48;

    let height = 48; // Default 1 hour
    if (event.end_time) {
      const endDate = new Date(event.end_time);
      const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
      height = (durationMinutes / 60) * 48;
    }

    return { top, height: Math.max(height, 24) };
  };

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      {/* Header with days */}
      <div className="grid grid-cols-8 border-b">
        <div className="py-3 text-center text-xs font-medium text-muted-foreground">
          Hora
        </div>
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              'py-3 text-center border-l cursor-pointer hover:bg-accent/50',
              isToday(day) && 'bg-primary/10'
            )}
            onClick={() => onDayClick(day)}
          >
            <p className="text-xs font-medium text-muted-foreground uppercase">
              {format(day, 'EEE', { locale: pt })}
            </p>
            <p
              className={cn(
                'text-lg font-semibold',
                isToday(day) && 'text-primary'
              )}
            >
              {format(day, 'd')}
            </p>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="grid grid-cols-8 max-h-[600px] overflow-y-auto">
        {/* Hours column */}
        <div className="border-r">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-12 border-b text-xs text-muted-foreground flex items-start justify-end pr-2 pt-1"
            >
              {format(new Date().setHours(hour, 0), 'HH:mm')}
            </div>
          ))}
        </div>

        {/* Days columns */}
        {days.map((day) => {
          const dayEvents = getEventsForDay(day).filter((e) => !e.all_day);
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'relative border-l',
                isToday(day) && 'bg-primary/5'
              )}
              onClick={() => onDayClick(day)}
            >
              {HOURS.map((hour) => (
                <div key={hour} className="h-12 border-b cursor-pointer hover:bg-accent/30" />
              ))}
              
              {/* Events */}
              {dayEvents.map((event) => {
                const { top, height } = getEventPosition(event);
                const colorClass = EVENT_TYPE_COLORS[event.event_type];
                
                return (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick(event);
                    }}
                    className={cn(
                      'absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] text-white font-medium truncate cursor-pointer hover:opacity-90',
                      colorClass
                    )}
                    style={{ top: `${top}px`, height: `${height}px` }}
                  >
                    {event.title}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
