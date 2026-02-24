import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar, Clock, Video, Loader2 } from 'lucide-react';
import { REMINDER_OPTIONS } from '@/types/calendar';

interface CalendarAlertSettings {
  default_reminder_minutes: number | null;
  auto_reminder_meetings: boolean;
  auto_reminder_minutes: number;
}

const DEFAULT_SETTINGS: CalendarAlertSettings = {
  default_reminder_minutes: null,
  auto_reminder_meetings: true,
  auto_reminder_minutes: 60,
};

export function CalendarAlertsSettings() {
  const { organization } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<CalendarAlertSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    async function fetch() {
      if (!organization?.id) return;
      const { data } = await supabase
        .from('organizations')
        .select('calendar_alert_settings')
        .eq('id', organization.id)
        .single();

      if (data) {
        const raw = (data as any).calendar_alert_settings as Record<string, any> | null;
        if (raw && typeof raw === 'object') {
          setSettings({
            default_reminder_minutes: raw.default_reminder_minutes ?? null,
            auto_reminder_meetings: raw.auto_reminder_meetings ?? true,
            auto_reminder_minutes: raw.auto_reminder_minutes ?? 60,
          });
        }
      }
      setIsLoading(false);
    }
    fetch();
  }, [organization?.id]);

  const handleSave = async () => {
    if (!organization?.id) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({ calendar_alert_settings: settings as any })
      .eq('id', organization.id);

    setIsSaving(false);
    if (error) {
      toast.error('Erro ao guardar definições');
    } else {
      toast.success('Definições de calendário guardadas');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Alertas de Calendário
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure lembretes automáticos para eventos e reuniões.
        </p>
      </div>

      {/* Default Reminder */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Lembrete Padrão
          </CardTitle>
          <CardDescription>
            Valor pré-selecionado ao criar um novo evento no calendário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Lembrar antes de</Label>
            <Select
              value={settings.default_reminder_minutes?.toString() ?? 'none'}
              onValueChange={(v) =>
                setSettings((s) => ({
                  ...s,
                  default_reminder_minutes: v === 'none' ? null : Number(v),
                }))
              }
            >
              <SelectTrigger className="w-full sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value ?? 'none'} value={opt.value?.toString() ?? 'none'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Auto Reminder for Meetings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4" />
            Reuniões e Chamadas
          </CardTitle>
          <CardDescription>
            Aplique automaticamente um lembrete a eventos do tipo Reunião e Chamada, mesmo que não seja configurado manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Lembrete automático</Label>
              <p className="text-xs text-muted-foreground">
                Ativo para reuniões e chamadas sem lembrete definido
              </p>
            </div>
            <Switch
              checked={settings.auto_reminder_meetings}
              onCheckedChange={(v) =>
                setSettings((s) => ({ ...s, auto_reminder_meetings: v }))
              }
            />
          </div>

          {settings.auto_reminder_meetings && (
            <div className="space-y-2">
              <Label>Quanto tempo antes</Label>
              <Select
                value={settings.auto_reminder_minutes.toString()}
                onValueChange={(v) =>
                  setSettings((s) => ({ ...s, auto_reminder_minutes: Number(v) }))
                }
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.filter((o) => o.value !== null).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value!.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
        {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Guardar Definições
      </Button>
    </div>
  );
}
