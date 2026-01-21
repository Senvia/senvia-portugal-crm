import { useState, useEffect, useMemo } from 'react';
import { Trash2, ShoppingCart, Printer } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUpdateProposal, useDeleteProposal, useProposalProducts } from '@/hooks/useProposals';
import { useUpdateLeadStatus, useUpdateLead } from '@/hooks/useLeads';
import { useFinalStages } from '@/hooks/usePipelineStages';
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
import { CreateSaleModal } from "@/components/sales/CreateSaleModal";

interface ProposalDetailsModalProps {
  proposal: Proposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposalDetailsModal({ proposal, open, onOpenChange }: ProposalDetailsModalProps) {
  const { data: proposalProducts = [] } = useProposalProducts(proposal?.id);
  const updateProposal = useUpdateProposal();
  const deleteProposal = useDeleteProposal();
  const updateLeadStatus = useUpdateLeadStatus();
  const updateLead = useUpdateLead();
  const { finalPositiveStage, finalNegativeStage } = useFinalStages();
  
  const [status, setStatus] = useState<ProposalStatus>('draft');
  const [notes, setNotes] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editValue, setEditValue] = useState<string>('0');
  const [showSaleModal, setShowSaleModal] = useState(false);

  // Sincronizar estado quando proposal muda
  useEffect(() => {
    if (proposal) {
      setEditValue(proposal.total_value.toString());
      setStatus(proposal.status);
      setNotes(proposal.notes || '');
    }
  }, [proposal]);

  // Early return if no proposal
  if (!proposal) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const handleStatusChange = (newStatus: ProposalStatus) => {
    // Quando seleciona "accepted", abre modal de venda (não muda status ainda)
    if (newStatus === 'accepted') {
      setShowSaleModal(true);
      return;
    }
    
    setStatus(newStatus);
    updateProposal.mutate({ id: proposal.id, status: newStatus });
    
    // When proposal is rejected, move lead to final negative stage
    if (newStatus === 'rejected') {
      if (proposal.lead_id && finalNegativeStage) {
        updateLeadStatus.mutate({ leadId: proposal.lead_id, status: finalNegativeStage.key });
      }
    }
  };

  // Callback quando venda é criada com sucesso
  const handleSaleCreated = () => {
    // Só aqui é que a proposta passa a "accepted"
    updateProposal.mutate({ id: proposal.id, status: 'accepted' });
    setStatus('accepted');
    
    // Atualizar lead para estágio final positivo
    if (proposal.lead_id && finalPositiveStage) {
      updateLeadStatus.mutate({ leadId: proposal.lead_id, status: finalPositiveStage.key });
      updateLead.mutate({ leadId: proposal.lead_id, updates: { value: proposal.total_value } });
    }
  };

  const handleNotesBlur = () => {
    if (notes !== proposal.notes) {
      updateProposal.mutate({ id: proposal.id, notes: notes.trim() || undefined });
    }
  };

  const handleValueBlur = () => {
    const newValue = parseFloat(editValue) || 0;
    if (newValue !== proposal.total_value) {
      updateProposal.mutate({ id: proposal.id, total_value: newValue });
    }
  };

  const handlePrint = () => {
    const printContent = `
      <html>
        <head>
          <title>Proposta ${proposal.code || ''}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            .header { border-bottom: 2px solid #3B82F6; padding-bottom: 20px; margin-bottom: 20px; }
            .header h1 { color: #3B82F6; margin: 0; font-size: 24px; }
            .header .date { color: #666; margin-top: 8px; font-size: 14px; }
            .total-box { background: #f0f9ff; border: 1px solid #3B82F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .total-box .label { font-size: 14px; color: #666; margin-bottom: 5px; }
            .total-box .value { font-size: 28px; font-weight: bold; color: #3B82F6; }
            .products { margin: 20px 0; }
            .products h3 { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px; font-size: 16px; }
            .product-item { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #eee; }
            .product-item:last-child { border-bottom: none; }
            .product-name { font-weight: 500; }
            .product-details { font-size: 12px; color: #666; margin-top: 4px; }
            .product-total { font-weight: 600; text-align: right; }
            .notes { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; }
            .notes h4 { margin: 0 0 10px 0; font-size: 14px; }
            .notes p { margin: 0; font-size: 14px; color: #555; white-space: pre-wrap; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; text-align: center; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Proposta ${proposal.code || ''}</h1>
            <div class="date">${format(new Date(proposal.proposal_date), "d 'de' MMMM 'de' yyyy", { locale: pt })}</div>
          </div>
          
          <div class="total-box">
            <div class="label">Valor Total</div>
            <div class="value">${formatCurrency(parseFloat(editValue) || proposal.total_value)}</div>
          </div>

          ${proposalProducts.length > 0 ? `
            <div class="products">
              <h3>Produtos/Serviços</h3>
              ${proposalProducts.map(item => `
                <div class="product-item">
                  <div>
                    <div class="product-name">${item.product?.name || 'Produto'}</div>
                    <div class="product-details">${item.quantity} × ${formatCurrency(item.unit_price)}</div>
                  </div>
                  <div class="product-total">${formatCurrency(item.total)}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}

          ${notes ? `
            <div class="notes">
              <h4>Observações</h4>
              <p>${notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Documento gerado em ${format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: pt })}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
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
          <DialogHeader className="pr-10">
            <div className="flex items-center gap-3">
              <DialogTitle>
                Proposta {proposal.code || ''}
              </DialogTitle>
              <Badge className={cn(PROPOSAL_STATUS_COLORS[status])}>
                {PROPOSAL_STATUS_LABELS[status]}
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Valor Total</p>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={handleValueBlur}
                    className="text-2xl font-bold text-primary border-none p-0 h-auto bg-transparent focus-visible:ring-1 focus-visible:ring-primary/50 max-w-[180px]"
                  />
                  <span className="text-lg text-primary font-medium">€</span>
                </div>
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
              <Select 
                value={status} 
                onValueChange={(v) => handleStatusChange(v as ProposalStatus)}
                disabled={status === 'accepted'}
              >
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

          <DialogFooter className="flex justify-between sm:justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fechar
              </Button>
            </div>
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

      <CreateSaleModal
        open={showSaleModal}
        onOpenChange={setShowSaleModal}
        prefillProposal={proposal}
        prefillClientId={proposal.client_id}
        onSaleCreated={handleSaleCreated}
      />
    </>
  );
}
