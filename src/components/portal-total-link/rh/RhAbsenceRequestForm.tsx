import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { absenceTypeLabels, type DatePeriod, type RhHoliday } from "@/lib/rh-utils";
import { useCreateAbsence, useMyVacationBalance, useTeamOverlappingAbsences } from "@/hooks/useRhAbsences";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { absenceTypeLabels as typeLabels } from "@/lib/rh-utils";
import RhMultiPeriodSelector from "./RhMultiPeriodSelector";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holidays: RhHoliday[];
}

export default function RhAbsenceRequestForm({ open, onOpenChange, holidays }: Props) {
  const [absenceType, setAbsenceType] = useState("");
  const [periods, setPeriods] = useState<DatePeriod[]>([]);
  const [notes, setNotes] = useState("");

  const createAbsence = useCreateAbsence();
  const { data: balance } = useMyVacationBalance();

  const maxVacationDays = balance ? balance.total_days - balance.used_days : undefined;

  const handleSubmit = async () => {
    if (!absenceType || periods.length === 0) return;

    await createAbsence.mutateAsync({
      absenceType,
      periods,
      notes,
      holidays,
    });

    setAbsenceType("");
    setPeriods([]);
    setNotes("");
    onOpenChange(false);
  };

  const reset = () => {
    setAbsenceType("");
    setPeriods([]);
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Marcar Ausência</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tipo de Ausência *</label>
            <Select value={absenceType} onValueChange={setAbsenceType}>
              <SelectTrigger><SelectValue placeholder="Selecionar tipo" /></SelectTrigger>
              <SelectContent>
                {Object.entries(absenceTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <RhMultiPeriodSelector
            periods={periods}
            onPeriodsChange={setPeriods}
            holidays={holidays}
            maxDays={absenceType === "vacation" ? maxVacationDays : undefined}
            absenceType={absenceType}
          />

          <div>
            <label className="block text-sm font-medium mb-1.5">Notas</label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!absenceType || periods.length === 0 || createAbsence.isPending}
            className="w-full"
          >
            {createAbsence.isPending ? "A submeter..." : "Submeter Pedido"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
