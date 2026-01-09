import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, RefreshCw, Trash2, Zap, Send, Smartphone, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

interface DiagnosticState {
  permission: NotificationPermission;
  isStandalone: boolean;
  swStatus: 'none' | 'installing' | 'waiting' | 'active' | 'error';
  swVersion: string | null;
  subscriptionEndpoint: string | null;
  subscriptionCreated: string | null;
}

export function PushDiagnostics() {
  const { organization } = useAuth();
  const { isSupported, isSubscribed, subscribe, unsubscribe, isLoading: hookLoading } = usePushNotifications();
  const { toast } = useToast();
  
  const [diagnostics, setDiagnostics] = useState<DiagnosticState>({
    permission: 'default',
    isStandalone: false,
    swStatus: 'none',
    swVersion: null,
    subscriptionEndpoint: null,
    subscriptionCreated: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState<'ping' | 'full' | null>(null);
  const [isRecreating, setIsRecreating] = useState(false);
  const [testResults, setTestResults] = useState<{ type: string; success: boolean; details: string } | null>(null);

  // Fetch diagnostics
  const fetchDiagnostics = async () => {
    setIsRefreshing(true);
    try {
      const state: DiagnosticState = {
        permission: 'Notification' in window ? Notification.permission : 'default',
        isStandalone: window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true,
        swStatus: 'none',
        swVersion: null,
        subscriptionEndpoint: null,
        subscriptionCreated: null,
      };

      // Check Service Worker
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          if (registration.active) {
            state.swStatus = 'active';
          } else if (registration.waiting) {
            state.swStatus = 'waiting';
          } else if (registration.installing) {
            state.swStatus = 'installing';
          }
          
          // Try to get SW version from controller
          if (navigator.serviceWorker.controller) {
            state.swVersion = 'Ativo';
          }

          // Check push subscription
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            state.subscriptionEndpoint = subscription.endpoint.substring(0, 50) + '...';
          }
        }
      }

      setDiagnostics(state);
    } catch (error) {
      console.error('Error fetching diagnostics:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDiagnostics();
  }, [isSubscribed]);

  // Update Service Worker
  const handleUpdateSW = async () => {
    setIsRefreshing(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        toast({
          title: 'Service Worker atualizado',
          description: 'A página será recarregada.',
        });
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o Service Worker.',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Recreate subscription
  const handleRecreateSubscription = async () => {
    setIsRecreating(true);
    try {
      await unsubscribe();
      await new Promise(r => setTimeout(r, 500));
      await subscribe();
      toast({
        title: 'Subscrição recriada',
        description: 'Nova subscrição push criada com sucesso.',
      });
      fetchDiagnostics();
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível recriar a subscrição.',
        variant: 'destructive',
      });
    } finally {
      setIsRecreating(false);
    }
  };

  // Send test notification
  const handleTest = async (type: 'ping' | 'full') => {
    if (!organization?.id) {
      toast({
        title: 'Erro',
        description: 'Organização não encontrada.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(type);
    setTestResults(null);

    try {
      const payload: any = {
        organization_id: organization.id,
      };

      if (type === 'ping') {
        payload.ping_only = true;
        payload.title = '';
        payload.body = '';
      } else {
        payload.title = 'Teste Senvia';
        payload.body = 'Se vires isto, as notificações funcionam! 🎉';
        payload.url = '/settings';
        payload.tag = 'test-' + Date.now();
      }

      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: payload,
      });

      if (error) throw error;

      const success = data?.sent > 0;
      setTestResults({
        type: type === 'ping' ? 'PING' : 'Completo',
        success,
        details: `${data?.sent || 0}/${data?.total || 0} enviados. ${data?.expired_removed ? `${data.expired_removed} expirados removidos.` : ''}`,
      });

      toast({
        title: success ? 'Enviado!' : 'Sem destinatários',
        description: success 
          ? `Notificação ${type === 'ping' ? 'PING' : 'completa'} enviada. Aguarde alguns segundos.`
          : 'Não há subscrições ativas para esta organização.',
        variant: success ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Test error:', error);
      setTestResults({
        type: type === 'ping' ? 'PING' : 'Completo',
        success: false,
        details: error instanceof Error ? error.message : 'Erro desconhecido',
      });
      toast({
        title: 'Erro no teste',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(null);
    }
  };

  const StatusBadge = ({ ok, label }: { ok: boolean; label: string }) => (
    <Badge variant={ok ? 'default' : 'destructive'} className="gap-1">
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
      {label}
    </Badge>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Diagnóstico Push
            </CardTitle>
            <CardDescription>
              Verifique o estado das notificações push e teste o envio
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchDiagnostics}
            disabled={isRefreshing}
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Suporte Push</p>
            <StatusBadge ok={isSupported} label={isSupported ? 'Sim' : 'Não'} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Permissão</p>
            <Badge variant={diagnostics.permission === 'granted' ? 'default' : diagnostics.permission === 'denied' ? 'destructive' : 'secondary'}>
              {diagnostics.permission === 'granted' ? 'Permitido' : diagnostics.permission === 'denied' ? 'Negado' : 'Pendente'}
            </Badge>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Modo PWA</p>
            <StatusBadge ok={diagnostics.isStandalone} label={diagnostics.isStandalone ? 'Sim' : 'Não'} />
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Service Worker</p>
            <Badge variant={diagnostics.swStatus === 'active' ? 'default' : 'secondary'}>
              {diagnostics.swStatus === 'active' ? 'Ativo' : diagnostics.swStatus === 'none' ? 'Nenhum' : diagnostics.swStatus}
            </Badge>
          </div>
          <div className="space-y-1 col-span-2">
            <p className="text-xs text-muted-foreground">Subscrição</p>
            <StatusBadge ok={isSubscribed} label={isSubscribed ? 'Ativa' : 'Inativa'} />
            {diagnostics.subscriptionEndpoint && (
              <p className="text-xs text-muted-foreground font-mono truncate mt-1">
                {diagnostics.subscriptionEndpoint}
              </p>
            )}
          </div>
        </div>

        {/* Warning if not in PWA mode */}
        {!diagnostics.isStandalone && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-500">Não está em modo PWA</p>
              <p className="text-muted-foreground">
                Para receber notificações no iOS, adicione o site ao ecrã inicial via Safari.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Ações</p>
          
          <div className="grid grid-cols-2 gap-2">
            {!isSubscribed ? (
              <Button
                onClick={() => subscribe()}
                disabled={hookLoading}
                className="col-span-2"
              >
                {hookLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
                Ativar Notificações
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handleUpdateSW}
                  disabled={isRefreshing}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar SW
                </Button>
                <Button
                  variant="outline"
                  onClick={handleRecreateSubscription}
                  disabled={isRecreating}
                >
                  {isRecreating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Recriar Sub.
                </Button>
              </>
            )}
          </div>

          {isSubscribed && (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => handleTest('ping')}
                disabled={isTesting !== null}
              >
                {isTesting === 'ping' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Teste PING
              </Button>
              <Button
                onClick={() => handleTest('full')}
                disabled={isTesting !== null}
              >
                {isTesting === 'full' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Teste Completo
              </Button>
            </div>
          )}
        </div>

        {/* Test Results */}
        {testResults && (
          <div className={`p-3 rounded-lg border ${testResults.success ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="flex items-center gap-2">
              {testResults.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-medium">
                Teste {testResults.type}: {testResults.success ? 'Enviado' : 'Falhou'}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{testResults.details}</p>
          </div>
        )}

        {/* Help text */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p><strong>PING:</strong> Envia notificação vazia (sem encriptação) - útil para testar conectividade.</p>
          <p><strong>Completo:</strong> Envia notificação com título e mensagem encriptada.</p>
          <p className="pt-1">Se o PING funcionar mas o Completo não, há um problema de encriptação.</p>
        </div>
      </CardContent>
    </Card>
  );
}
