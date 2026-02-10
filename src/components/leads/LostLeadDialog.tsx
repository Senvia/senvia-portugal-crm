import { useState } from "react";
import { addDays, format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarClock, Phone, Users } from "lucide-react";

const LOSS_REASONS = [
  { value: "price", label: "Preço" },
  { value: "competition", label: "Concorrência" },
  { value: "no_response", label: "Sem resposta" },
  { value: "timing", label: "Timing / Não é o momento" },
  { value: "other", label: "Outro" },
] as const;

const EVENT_TYPES = [
  { value: "call", label: "Chamada", icon: Phone },
  { value: "meeting", label: "Reunião", icon: Users },
] as const;

interface LostLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadName: string;
  onConfirm: (data: {
    lossReason: string;
    notes: string;
    followUpDate: string;
    eventType: "call" | "meeting";
  }) => void;
}

export function LostLeadDialog({
  open,
  onOpenChange,
  leadName,
  onConfirm,
}: LostLeadDialogProps) {
  const [lossReason, setLossReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [eventType, setEventType] = useState<"call" | "meeting">("call");

  const handleQuickDate = (days: number) => {
    const date = addDays(new Date(), days);
    setFollowUpDate(format(date, "yyyy-MM-dd"));
  };

  const handleConfirm = () => {
    if (!lossReason || !followUpDate) return;
    onConfirm({ lossReason, notes, followUpDate, eventType });
    // Reset
    setLossReason("");
    setNotes("");
    setFollowUpDate("");
    setEventType("call");
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setLossReason("");
      setNotes("");
      setFollowUpDate("");
      setEventType("call");
    }
    onOpenChange(open);
  };

  const isValid = lossReason && followUpDate;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-warning" />
            Agendar Recontacto
          </DialogTitle>
          <DialogDescription>
            Antes de marcar <strong>{leadName}</strong> como perdido, agende um follow-up futuro para tentar recuperar este lead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Loss Reason */}
          <div className="space-y-2">
            <Label>Motivo da perda *</Label>
            <Select value={lossReason} onValueChange={setLossReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar motivo" />
              </SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((reason) => (
                  <SelectItem key={reason.value} value={reason.value}>
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas adicionais</Label>
            <Textarea
              placeholder="Detalhes sobre a perda..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
            />
          </div>

          {/* Follow-up Date */}
          <div className="space-y-2">
            <Label>Data de recontacto *</Label>
            <div className="flex gap-2 mb-2">
              {[
                { days: 30, label: "30 dias" },
                { days: 60, label: "60 dias" },
                { days: 90, label: "90 dias" },
              ].map(({ days, label }) => (
                <Button
                  key={days}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => handleQuickDate(days)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={format(addDays(new Date(), 1), "yyyy-MM-dd")}
            />
            {followUpDate && (
              <p className="text-xs text-muted-foreground">
                Recontacto a {format(new Date(followUpDate + "T12:00:00"), "d 'de' MMMM 'de' yyyy", { locale: pt })}
              </p>
            )}
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label>Tipo de evento</Label>
            <div className="flex gap-2">
              {EVENT_TYPES.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  type="button"
                  variant={eventType === value ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setEventType(value as "call" | "meeting")}
                >
                  <Icon className="h-4 w-4 mr-1.5" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => handleClose(false)} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid} className="w-full sm:w-auto">
            <CalendarClock className="h-4 w-4 mr-2" />
            Confirmar e Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
