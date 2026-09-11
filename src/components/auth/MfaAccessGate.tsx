import { useAuth } from '@/contexts/AuthContext';
import { EnrollMFA } from './EnrollMFA';
import { ChallengeMFA } from './ChallengeMFA';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function MfaAccessGate() {
  const { mfaStatus, completeMfaChallenge, signOut } = useAuth();
  if (mfaStatus === 'pending') return <ChallengeMFA onSuccess={completeMfaChallenge} />;
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4">
        {mfaStatus === 'checking' ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-label="A verificar segurança" /> :
          mfaStatus === 'enrollment' ? <>
            <p className="text-center text-muted-foreground">Para proteger o acesso de administrador, ative a autenticação de dois fatores.</p>
            <EnrollMFA onSuccess={completeMfaChallenge} onCancel={signOut} />
          </> : <>
            <p>Não foi possível verificar a segurança da sessão. Tente novamente.</p>
            <Button onClick={completeMfaChallenge}>Tentar novamente</Button>
            <Button variant="outline" onClick={signOut}>Terminar sessão</Button>
          </>}
      </div>
    </div>
  );
}
