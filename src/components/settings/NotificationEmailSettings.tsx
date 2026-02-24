import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useFidelizationSettings, useUpdateFidelizationSettings } from '@/hooks/useFidelizationAlerts';
import { toast } from 'sonner';
import { Mail, Loader2 } from 'lucide-react';

export function NotificationEmailSettings() {
  const { data: settings, isLoading } = useFidelizationSettings();
  const updateSettings = useUpdateFidelizationSettings();

  const [emailEnabled, setEmailEnabled] = useState(false);
  const [alertEmail, setAlertEmail] = useState('');

  useEffect(() => {
    if (settings) {
      setEmailEnabled(settings.fidelization_email_enabled);
      setAlertEmail(settings.fidelization_email || '');
    }
  }, [settings]);

  const handleSave = () => {
    if (emailEnabled && !alertEmail.trim()) {
      toast.error('Introduza um email para receber os alertas');
      return;
    }

    if (emailEnabled && !alertEmail.includes('@')) {
      toast.error('Email inválido');
      return;
    }

    updateSettings.mutate({
      fidelization_email_enabled: emailEnabled,
      fidelization_email: emailEnabled ? alertEmail.trim() : null,
    }, {
      onSuccess: () => toast.success('Definições de email guardadas'),
      onError: () => toast.error('Erro ao guardar definições'),
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
          <Mail className="h-5 w-5 text-primary" />
          Alertas por Email
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure o email para receber alertas automáticos (calendário, fidelização, etc.).
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Configuração de Email
          </CardTitle>
          <CardDescription>
            Aplica-se a todos os alertas do sistema (calendário, fidelização, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Receber alertas por email</Label>
              <p className="text-xs text-muted-foreground">
                Usa as definições Brevo da organização
              </p>
            </div>
            <Switch
              checked={emailEnabled}
              onCheckedChange={setEmailEnabled}
            />
          </div>

          {emailEnabled && (
            <div className="space-y-2">
              <Label htmlFor="alert-email">Email para alertas</Label>
              <Input
                id="alert-email"
                type="email"
                value={alertEmail}
                onChange={(e) => setAlertEmail(e.target.value)}
                placeholder="comercial@empresa.pt"
              />
            </div>
          )}
        </CardContent>
      </Card>

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
