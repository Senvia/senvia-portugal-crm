import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateEvent, useUpdateEvent } from '@/hooks/useCalendarEvents';
import { useLeads } from '@/hooks/useLeads';
import { EVENT_TYPE_LABELS, REMINDER_OPTIONS, type CalendarEvent, type EventType } from '@/types/calendar';
import { format } from 'date-fns';
import { Video, Phone, CheckSquare, RefreshCw, Loader2 } from 'lucide-react';

const EVENT_TYPE_ICONS: Record<EventType, React.ReactNode> = {
  meeting: <Video className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  task: <CheckSquare className="h-4 w-4" />,
  follow_up: <RefreshCw className="h-4 w-4" />,
};

interface CreateEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  event?: CalendarEvent | null;
  preselectedLeadId?: string;
  onSuccess?: () => void;
}

export function CreateEventModal({ open, onOpenChange, selectedDate, event, preselectedLeadId, onSuccess }: CreateEventModalProps) {
  const { data: leads = [] } = useLeads();
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('task');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [leadId, setLeadId] = useState<string>('');
  const [reminderMinutes, setReminderMinutes] = useState<string>('');
  const [endTimeManuallySet, setEndTimeManuallySet] = useState(false);

  const isEditing = !!event;

  // Calculate end time +1 hour from start time
  const calculateAutoEndTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const endHour = (hours + 1) % 24;
    return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  const handleStartTimeChange = (newStartTime: string) => {
    setStartTime(newStartTime);
    // Auto-calculate end time if not manually set
    if (!endTimeManuallySet) {
      setEndTime(calculateAutoEndTime(newStartTime));
    }
  };

  const handleEndTimeChange = (newEndTime: string) => {
    setEndTimeManuallySet(true);
    setEndTime(newEndTime);
  };

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
      setEventType(event.event_type);
      setStartDate(format(new Date(event.start_time), 'yyyy-MM-dd'));
      setStartTime(format(new Date(event.start_time), 'HH:mm'));
      if (event.end_time) {
        setEndDate(format(new Date(event.end_time), 'yyyy-MM-dd'));
        setEndTime(format(new Date(event.end_time), 'HH:mm'));
      }
      setAllDay(event.all_day);
      setLeadId(event.lead_id || '');
      setReminderMinutes(event.reminder_minutes?.toString() || '');
      setEndTimeManuallySet(true); // Preserve existing end time when editing
    } else if (selectedDate) {
      setStartDate(format(selectedDate, 'yyyy-MM-dd'));
      setEndDate(format(selectedDate, 'yyyy-MM-dd'));
      setEndTimeManuallySet(false); // Reset for new events
    }
    
    // Pre-select lead if provided (from Kanban drop)
    if (preselectedLeadId && open && !event) {
      setLeadId(preselectedLeadId);
      setEventType('meeting'); // Default to meeting for scheduled leads
    }
  }, [event, selectedDate, open, preselectedLeadId]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setEventType('task');
    setStartDate('');
    setStartTime('09:00');
    setEndDate('');
    setEndTime('10:00');
    setAllDay(false);
    setLeadId('');
    setReminderMinutes('');
    setEndTimeManuallySet(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const startDateTime = allDay
      ? new Date(`${startDate}T00:00:00`).toISOString()
      : new Date(`${startDate}T${startTime}:00`).toISOString();

    const endDateTime = endDate
      ? allDay
        ? new Date(`${endDate}T23:59:59`).toISOString()
        : new Date(`${endDate}T${endTime}:00`).toISOString()
      : undefined;

    const params = {
      title,
      description: description || undefined,
      event_type: eventType,
      start_time: startDateTime,
      end_time: endDateTime,
      all_day: allDay,
      lead_id: leadId || undefined,
      reminder_minutes: reminderMinutes ? parseInt(reminderMinutes) : null,
    };

    if (isEditing && event) {
      await updateEvent.mutateAsync({ id: event.id, ...params });
    } else {
      await createEvent.mutateAsync(params);
    }

    resetForm();
    onOpenChange(false);
    onSuccess?.();
  };

  const isPending = createEvent.isPending || updateEvent.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Reunião com cliente"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      {EVENT_TYPE_ICONS[type]}
                      {EVENT_TYPE_LABELS[type]}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={allDay} onCheckedChange={setAllDay} id="all-day" />
            <Label htmlFor="all-day">Dia inteiro</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início *</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label>Hora Início</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            {!allDay && (
              <div className="space-y-2">
                <Label>Hora Fim</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Lead Associado</Label>
            <Select value={leadId || "none"} onValueChange={(v) => setLeadId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lembrete</Label>
            <Select value={reminderMinutes || "none"} onValueChange={(v) => setReminderMinutes(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Sem lembrete" />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value ?? 'none'} value={option.value?.toString() ?? 'none'}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notas adicionais..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? 'Guardar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
