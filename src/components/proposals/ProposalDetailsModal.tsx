import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateProposal, useDeleteProposal, useProposalProducts } from '@/hooks/useProposals';
import { PROPOSAL_STATUS_LABELS, PROPOSAL_STATUS_COLORS, PROPOSAL_STATUSES } from '@/types/proposals';
import type { Proposal, ProposalStatus } from '@/types/proposals';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ProposalDetailsModalProps {
  proposal: Proposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposalDetailsModal({ proposal, open, onOpenChange }: ProposalDetailsModalProps) {
  const { data: proposalProducts = [] } = useProposalProducts(proposal.id);
  const updateProposal = useUpdateProposal();
  const deleteProposal = useDeleteProposal();
  
  const [status, setStatus] = useState<ProposalStatus>(proposal.status);
  const [notes, setNotes] = useState(proposal.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleStatusChange = (newStatus: ProposalStatus) => {
    setStatus(newStatus);
    updateProposal.mutate({ id: proposal.id, status: newStatus });
  };

  const handleNotesBlur = () => {
    if (notes !== proposal.notes) {
      updateProposal.mutate({ id: proposal.id, notes: notes.trim() || undefined });
    }
  };

  const handleDelete = () => {
    deleteProposal.mutate(proposal.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onOpenChange(false);
      },
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detalhes da Proposta</span>
              <Badge className={cn('ml-2', PROPOSAL_STATUS_COLORS[status])}>
                {PROPOSAL_STATUS_LABELS[status]}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(proposal.total_value)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Data</p>
                <p className="font-medium">
                  {format(new Date(proposal.proposal_date), "d 'de' MMMM 'de' yyyy", { locale: pt })}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status da Proposta</Label>
              <Select value={status} onValueChange={(v) => handleStatusChange(v as ProposalStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPOSAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PROPOSAL_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {proposalProducts.length > 0 && (
              <div className="space-y-2">
                <Label>Produtos/Serviços</Label>
                <div className="space-y-2">
                  {proposalProducts.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                    >
                      <div>
                        <p className="font-medium text-sm">{item.product?.name || 'Produto'}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.total)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="proposal-notes">Observações da Negociação</Label>
              <Textarea
                id="proposal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                placeholder="Notas internas sobre a negociação..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proposta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar esta proposta? Esta ação não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
