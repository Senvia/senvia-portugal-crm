import { useState, useMemo, useEffect } from 'react';
import { addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { useTeamMembers } from '@/hooks/useTeam';
import { usePermissions } from '@/hooks/usePermissions';
import { CalendarHeader, type ViewType } from './CalendarHeader';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { CreateEventModal } from './CreateEventModal';
import { EventDetailsModal } from './EventDetailsModal';
import type { CalendarEvent } from '@/types/calendar';
import { Loader2 } from 'lucide-react';

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [filterUserId, setFilterUserId] = useState<string>('all');

  const { canManageTeam: isAdmin } = usePermissions();
  const { data: teamMembers = [] } = useTeamMembers();

  // Calculate date range based on view
  const dateRange = useMemo(() => {
    switch (view) {
      case 'month': {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          start: startOfWeek(monthStart, { weekStartsOn: 1 }),
          end: endOfWeek(monthEnd, { weekStartsOn: 1 }),
        };
      }
      case 'week': {
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      }
      case 'day':
        return {
          start: currentDate,
          end: currentDate,
        };
    }
  }, [currentDate, view]);

  const { data: events = [], isLoading } = useCalendarEvents(dateRange.start, dateRange.end);

  // Sync selectedEvent with updated data from events list
  useEffect(() => {
    if (selectedEvent && events.length > 0) {
      const updatedEvent = events.find((e) => e.id === selectedEvent.id);
      if (updatedEvent) {
        setSelectedEvent(updatedEvent);
      }
    }
  }, [events]);

  // Filter events by user if admin filter is active
  const filteredEvents = useMemo(() => {
    if (!isAdmin || filterUserId === 'all') {
      return events;
    }
    return events.filter((event) => event.user_id === filterUserId);
  }, [events, filterUserId, isAdmin]);

  const handlePrevious = () => {
    switch (view) {
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(subDays(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (view) {
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
    setCreateModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setDetailsModalOpen(true);
  };

  const handleEditEvent = () => {
    setDetailsModalOpen(false);
    setCreateModalOpen(true);
  };

  const handleCreateEvent = () => {
    setSelectedDate(new Date());
    setSelectedEvent(null);
    setCreateModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
        onCreateEvent={handleCreateEvent}
        filterUserId={filterUserId}
        onFilterChange={setFilterUserId}
        teamMembers={teamMembers.map((m) => ({ id: m.id, full_name: m.full_name }))}
        isAdmin={isAdmin}
      />

      {view === 'month' && (
        <MonthView
          currentDate={currentDate}
          events={filteredEvents}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
        />
      )}

      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          events={filteredEvents}
          onDayClick={handleDayClick}
          onEventClick={handleEventClick}
        />
      )}

      {view === 'day' && (
        <DayView
          currentDate={currentDate}
          events={filteredEvents}
          onEventClick={handleEventClick}
        />
      )}

      <CreateEventModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        selectedDate={selectedDate}
        event={selectedEvent}
      />

      <EventDetailsModal
        open={detailsModalOpen}
        onOpenChange={setDetailsModalOpen}
        event={selectedEvent}
        onEdit={handleEditEvent}
      />
    </div>
  );
}
