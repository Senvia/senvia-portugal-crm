import { useEffect, useState } from 'react';
import { Loader2, Minus, Plus, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const SEAT_PRICE = 5;

interface ManageSeatsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  organizationName: string;
  currentSeats: number;
}

/**
 * Gestão de utilizadores extra de uma organização cliente, a partir do CRM.
 *
 * Chama a `buy-extra-seats`, que faz as DUAS coisas numa só operação: liberta
 * (ou retira) os lugares na conta do cliente e ajusta a quantidade na
 * subscrição Stripe. Fazê-lo só de um lado é como se dá acesso sem cobrar, ou
 * se cobra sem dar acesso.
 */
export function ManageSeatsDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  currentSeats,
}: ManageSeatsDialogProps) {
  const [seats, setSeats] = useState(currentSeats);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // O diálogo é reutilizado entre linhas da tabela: sem isto abria com o número
  // da organização anterior.
  useEffect(() => {
    if (open) setSeats(currentSeats);
  }, [open, currentSeats]);

  const delta = seats - currentSeats;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ error?: string }>('buy-extra-seats', {
        body: { quantity: seats, organization_id: organizationId },
      });
      if (error) throw new Error(data?.error ?? error.message);
      if (data?.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ['super-admin-orgs-list'] });
      toast.success(
        delta > 0
          ? `${delta} lugar${delta > 1 ? 'es' : ''} adicionado${delta > 1 ? 's' : ''} a ${organizationName}`
          : `Lugares atualizados para ${seats}`,
      );
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível atualizar os lugares');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Utilizadores extra
          </DialogTitle>
          <DialogDescription>{organizationName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="seats">Quantidade</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setSeats((n) => Math.max(0, n - 1))}
                disabled={seats <= 0 || isSaving}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="seats"
                type="number"
                min={0}
                value={seats}
                onChange={(e) => setSeats(Math.max(0, Number.parseInt(e.target.value, 10) || 0))}
                className="text-center"
                disabled={isSaving}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setSeats((n) => n + 1)}
                disabled={isSaving}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Atualmente</span>
              <span>{currentSeats} × {SEAT_PRICE}€ = {currentSeats * SEAT_PRICE}€/mês</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Depois</span>
              <span>{seats} × {SEAT_PRICE}€ = {seats * SEAT_PRICE}€/mês</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {delta === 0
              ? 'Sem alterações.'
              : delta > 0
                ? `Os lugares ficam disponíveis de imediato na conta do cliente, e a subscrição passa a cobrar mais ${delta * SEAT_PRICE}€ por mês a partir do próximo ciclo.`
                : `A subscrição passa a cobrar menos ${Math.abs(delta) * SEAT_PRICE}€ por mês. Confirme que a equipa do cliente já não usa esses lugares.`}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving || delta === 0}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
