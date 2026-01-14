import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDeleteEvent, useUpdateEvent } from '@/hooks/useCalendarEvents';
import {
  EVENT_TYPE_LABELS,
  EVENT_TYPE_COLORS,
  EVENT_STATUS_LABELS,
  REMINDER_OPTIONS,
  type CalendarEvent,
  type EventType,
} from '@/types/calendar';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Video,
  Phone,
  CheckSquare,
  RefreshCw,
  Calendar,
  Clock,
  Bell,
  User,
  Trash2,
  Edit,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const EVENT_TYPE_ICONS: Record<EventType, React.ElementType> = {
  meeting: Video,
  call: Phone,
  task: CheckSquare,
  follow_up: RefreshCw,
};

interface EventDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onEdit?: () => void;
}

export function EventDetailsModal({ open, onOpenChange, event, onEdit }: EventDetailsModalProps) {
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();

  if (!event) return null;

  const Icon = EVENT_TYPE_ICONS[event.event_type];
  const colorClass = EVENT_TYPE_COLORS[event.event_type];

  const handleDelete = async () => {
    await deleteEvent.mutateAsync(event.id);
    onOpenChange(false);
  };

  const handleMarkComplete = async () => {
    await updateEvent.mutateAsync({
      id: event.id,
      status: event.status === 'completed' ? 'pending' : 'completed',
    });
  };

  const handleCancel = async () => {
    await updateEvent.mutateAsync({
      id: event.id,
      status: 'cancelled',
    });
  };

  const reminderLabel = REMINDER_OPTIONS.find((opt) => opt.value === event.reminder_minutes)?.label || 'Sem lembrete';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={cn('p-2 rounded-lg text-white', colorClass)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">{event.title}</DialogTitle>
              <Badge variant="secondary" className="mt-1">
                {EVENT_TYPE_LABELS[event.event_type]}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado</span>
            <Badge
              className={cn(
                event.status === 'completed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                event.status === 'pending' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                event.status === 'cancelled' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              {EVENT_STATUS_LABELS[event.status]}
            </Badge>
          </div>

          {/* Date & Time */}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {format(new Date(event.start_time), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt })}
            </span>
          </div>

          {!event.all_day && (
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {format(new Date(event.start_time), 'HH:mm', { locale: pt })}
                {event.end_time && ` - ${format(new Date(event.end_time), 'HH:mm', { locale: pt })}`}
              </span>
            </div>
          )}

          {/* Reminder */}
          <div className="flex items-center gap-3">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{reminderLabel}</span>
          </div>

          {/* Lead */}
          {event.lead && (
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Lead: {event.lead.name}</span>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkComplete}
            disabled={updateEvent.isPending}
          >
            {updateEvent.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : event.status === 'completed' ? (
              <X className="h-4 w-4 mr-1" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            {event.status === 'completed' ? 'Reabrir' : 'Concluir'}
          </Button>

          {event.status !== 'cancelled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={updateEvent.isPending}
            >
              <X className="h-4 w-4 mr-1" />
              Cancelar
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar evento?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O evento será permanentemente eliminado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  {deleteEvent.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </DialogContent>
    </Dialog>
  );
}
