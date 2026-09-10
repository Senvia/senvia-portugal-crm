import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useFidelizationSettings, useUpdateFidelizationSettings } from '@/hooks/useFidelizationAlerts';
import { toast } from 'sonner';
import { Bell, Calendar, Loader2, Zap, FileSignature } from 'lucide-react';

export function FidelizationAlertsSettings() {
  const { data: settings, isLoading } = useFidelizationSettings();
  const updateSettings = useUpdateFidelizationSettings();

  const [firstAlertDays, setFirstAlertDays] = useState(30);
  const [secondAlertDays, setSecondAlertDays] = useState(7);
  const [createEvent, setCreateEvent] = useState(true);
  const [eventTime, setEventTime] = useState('10:00');
  // Contract loyalty on sales — its own windows and channels.
  const [salesFirstDays, setSalesFirstDays] = useState(60);
  const [salesSecondDays, setSalesSecondDays] = useState(15);
  const [salesPush, setSalesPush] = useState(true);
  const [salesEmail, setSalesEmail] = useState(true);

  useEffect(() => {
    if (settings) {
      const days = settings.fidelization_alert_days;
      setFirstAlertDays(days[0] || 30);
      setSecondAlertDays(days[1] || 7);
      setCreateEvent(settings.fidelization_create_event);
      setEventTime(settings.fidelization_event_time?.slice(0, 5) || '10:00');
      setSalesFirstDays(settings.fidelization_sales_alert_days?.[0] || 60);
      setSalesSecondDays(settings.fidelization_sales_alert_days?.[1] || 15);
      setSalesPush(settings.fidelization_sales_push_enabled ?? true);
      setSalesEmail(settings.fidelization_sales_email_enabled ?? true);
    }
  }, [settings]);

  const handleSave = () => {
    if (firstAlertDays <= secondAlertDays) {
      toast.error('O primeiro alerta deve ser mais dias antes que o segundo');
      return;
    }
    if (salesFirstDays <= salesSecondDays) {
      toast.error('Na fidelização dos contratos, o primeiro aviso deve ser mais dias antes que o segundo');
      return;
    }

    updateSettings.mutate({
      fidelization_alert_days: [firstAlertDays, secondAlertDays],
      fidelization_create_event: createEvent,
      fidelization_event_time: eventTime,
      fidelization_sales_alert_days: [salesFirstDays, salesSecondDays],
      fidelization_sales_push_enabled: salesPush,
      fidelization_sales_email_enabled: salesEmail,
    }, {
      onSuccess: () => {
        toast.success('Definições de alertas guardadas');
      },
      onError: () => {
        toast.error('Erro ao guardar definições');
      },
    });
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
          <Zap className="h-5 w-5 text-primary" />
          Alertas de Fidelização
        </h2>
        <p className="text-sm text-muted-foreground">
          Alertas automáticos quando a fidelização de um contrato está a terminar — a das vendas telecom, e a dos CPE/CUI.
        </p>
      </div>

      {/* Alert Days Configuration */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Dias de Antecedência
          </CardTitle>
          <CardDescription>
            Defina quando deve ser notificado antes da expiração.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-alert">Primeiro alerta</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="first-alert"
                  type="number"
                  min={1}
                  max={90}
                  value={firstAlertDays}
                  onChange={(e) => setFirstAlertDays(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">dias</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="second-alert">Segundo alerta (urgente)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="second-alert"
                  type="number"
                  min={1}
                  max={30}
                  value={secondAlertDays}
                  onChange={(e) => setSecondAlertDays(Number(e.target.value))}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">dias</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Event Configuration */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Evento de Calendário
          </CardTitle>
          <CardDescription>
            Crie automaticamente eventos de "Visita de Renovação".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Criar evento automático</Label>
              <p className="text-xs text-muted-foreground">
                Adicionar ao calendário quando o alerta é enviado
              </p>
            </div>
            <Switch
              checked={createEvent}
              onCheckedChange={setCreateEvent}
            />
          </div>
          
          {createEvent && (
            <div className="space-y-2">
              <Label htmlFor="event-time">Hora sugerida para visita</Label>
              <Input
                id="event-time"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract loyalty on sales */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Fidelização dos contratos (vendas)
          </CardTitle>
          <CardDescription>
            Cada venda telecom tem uma data de fim de fidelização. Quem recebe os avisos são os administradores da
            organização — por notificação push e por email para o endereço de cada um.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sales-first-alert">Primeiro aviso</Label>
              <div className="flex items-center gap-2">
                <Input id="sales-first-alert" type="number" min={1} max={365} value={salesFirstDays} onChange={(e) => setSalesFirstDays(Number(e.target.value))} className="w-20" />
                <span className="text-sm text-muted-foreground">dias antes</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sales-second-alert">Segundo aviso (urgente)</Label>
              <div className="flex items-center gap-2">
                <Input id="sales-second-alert" type="number" min={1} max={90} value={salesSecondDays} onChange={(e) => setSalesSecondDays(Number(e.target.value))} className="w-20" />
                <span className="text-sm text-muted-foreground">dias antes</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notificação push</Label>
              <p className="text-xs text-muted-foreground">Para todos os administradores que tenham as notificações ativas</p>
            </div>
            <Switch checked={salesPush} onCheckedChange={setSalesPush} />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Email</Label>
              <p className="text-xs text-muted-foreground">Para o email de cada administrador da organização</p>
            </div>
            <Switch checked={salesEmail} onCheckedChange={setSalesEmail} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        disabled={updateSettings.isPending}
        className="w-full sm:w-auto"
      >
        {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Guardar Definições
      </Button>
    </div>
  );
}
