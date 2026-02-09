import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { EnrollMFA } from '@/components/auth/EnrollMFA';
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

export function SecuritySettings() {
  const { toast } = useToast();
  const [hasMFA, setHasMFA] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisabling, setIsDisabling] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);

  const checkMFAStatus = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = data?.totp?.filter(f => f.status === 'verified') || [];
      setHasMFA(verifiedFactors.length > 0);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const handleDisableMFA = async () => {
    setIsDisabling(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const totpFactors = data?.totp || [];

      for (const factor of totpFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      setHasMFA(false);
      toast({
        title: '2FA desativado',
        description: 'A autenticação de dois fatores foi desativada.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao desativar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDisabling(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (showEnroll) {
    return (
      <EnrollMFA
        onSuccess={() => {
          setShowEnroll(false);
          checkMFAStatus();
        }}
        onCancel={() => setShowEnroll(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <CardTitle className="text-lg">Autenticação de Dois Fatores (2FA)</CardTitle>
            <CardDescription>
              Proteja a sua conta com um código adicional ao iniciar sessão.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Estado:</span>
            {hasMFA ? (
              <Badge variant="default" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                Ativo
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <ShieldOff className="h-3 w-3" />
                Desativado
              </Badge>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {hasMFA
            ? 'A sua conta está protegida com autenticação de dois fatores. Será necessário um código do Microsoft Authenticator, Google Authenticator ou outra app TOTP para iniciar sessão.'
            : 'Ative a autenticação de dois fatores para adicionar uma camada extra de segurança à sua conta.'}
        </p>

        {hasMFA ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isDisabling}>
                {isDisabling ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />A desativar...</>
                ) : (
                  'Desativar 2FA'
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desativar 2FA?</AlertDialogTitle>
                <AlertDialogDescription>
                  A sua conta ficará menos segura sem a autenticação de dois fatores. Tem a certeza que deseja desativar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisableMFA}>
                  Sim, desativar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button onClick={() => setShowEnroll(true)} size="sm">
            Ativar 2FA
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
