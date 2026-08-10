import { useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useTestAutomationFlow } from '@/hooks/useAutomationFlows';

const DEFAULT_TEST_NAME = 'Contacto de teste';

interface TestFlowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flowId: string;
  /** Called once the engine accepted the run — the editor jumps to Atividade. */
  onStarted: () => void;
}

/**
 * Runs the flow for real against contact details the user types. Deliberately
 * blunt about it: the engine sends genuine WhatsApp messages and emails, so the
 * copy pushes the user towards their own contacts.
 *
 * The typed values survive closing the dialog — testing is usually done a few
 * times in a row against the same phone number.
 */
export function TestFlowDialog({ open, onOpenChange, flowId, onStarted }: TestFlowDialogProps) {
  const { user } = useAuth();
  const testFlow = useTestAutomationFlow();

  const [name, setName] = useState(DEFAULT_TEST_NAME);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(() => user?.email ?? '');

  const handleRun = async () => {
    if (!phone.trim() && !email.trim()) {
      toast.error('Indique um telefone ou um email', {
        description: 'O fluxo precisa de saber para onde enviar as mensagens.',
      });
      return;
    }

    try {
      await testFlow.mutateAsync({
        flow_id: flowId,
        name: name.trim() || DEFAULT_TEST_NAME,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
    } catch {
      // The mutation already raised a destructive toast with the engine's reason.
      return;
    }

    onOpenChange(false);
    onStarted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            Testar automação
          </DialogTitle>
          <DialogDescription>
            O fluxo corre a sério e envia mensagens reais para os dados que indicar.
            Use os seus próprios contactos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="test-name">Nome</Label>
            <Input
              id="test-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={DEFAULT_TEST_NAME}
              autoFocus
              onFocus={(e) => e.target.select()}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="test-phone">Telefone</Label>
            <Input
              id="test-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+351 912 345 678"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="test-email">Email</Label>
            <Input
              id="test-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="eu@empresa.pt"
            />
          </div>

          <p className="text-[11px] leading-snug text-muted-foreground">
            Basta preencher um dos dois. O teste corre mesmo com a automação em rascunho
            e não conta para as regras de reentrada.
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={testFlow.isPending}>
            Cancelar
          </Button>
          <Button onClick={handleRun} disabled={testFlow.isPending}>
            {testFlow.isPending
              ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              : <FlaskConical className="mr-1.5 h-4 w-4" />}
            Correr teste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
