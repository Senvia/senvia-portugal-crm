import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { User, Calendar, FileText, Trash2, MessageSquare, Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUpdateSale, useDeleteSale } from "@/hooks/useSales";
import { formatCurrency } from "@/lib/format";
import type { SaleWithDetails, SaleStatus } from "@/types/sales";
import { SALE_STATUS_LABELS, SALE_STATUS_COLORS, SALE_STATUSES } from "@/types/sales";

interface SaleDetailsModalProps {
  sale: SaleWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleDetailsModal({ sale, open, onOpenChange }: SaleDetailsModalProps) {
  const [status, setStatus] = useState<SaleStatus>("pending");
  const [notes, setNotes] = useState("");
  const [editValue, setEditValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();

  useEffect(() => {
    if (sale) {
      setStatus(sale.status);
      setNotes(sale.notes || "");
      setEditValue(sale.total_value?.toString() || "0");
    }
  }, [sale]);

  if (!sale) return null;

  const handleStatusChange = (newStatus: SaleStatus) => {
    setStatus(newStatus);
    updateSale.mutate({ saleId: sale.id, updates: { status: newStatus } });
  };

  const handleNotesBlur = () => {
    if (notes !== sale.notes) {
      updateSale.mutate({ saleId: sale.id, updates: { notes } });
    }
  };

  const handleValueBlur = () => {
    const numValue = parseFloat(editValue) || 0;
    if (numValue !== sale.total_value) {
      updateSale.mutate({ saleId: sale.id, updates: { total_value: numValue } });
    }
  };

  const handleDelete = () => {
    deleteSale.mutate(sale.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        onOpenChange(false);
      },
    });
  };

  const openWhatsApp = () => {
    if (sale.lead?.phone) {
      const phone = sale.lead.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${phone}`, "_blank");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${SALE_STATUS_COLORS[status]}`}
              >
                {SALE_STATUS_LABELS[status]}
              </Badge>
              <span className="text-muted-foreground font-normal text-sm">
                {format(new Date(sale.created_at), "d MMM yyyy", { locale: pt })}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status */}
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SALE_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Value */}
            <div className="space-y-2">
              <Label>Valor Total</Label>
              <Input
                type="number"
                step="0.01"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleValueBlur}
                className="text-lg font-semibold"
              />
            </div>

            <Separator />

            {/* Lead Info */}
            {sale.lead && (
              <div className="space-y-3">
                <Label className="text-muted-foreground">Cliente</Label>
                <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{sale.lead.name}</span>
                  </div>
                  {sale.lead.email && (
                    <p className="text-sm text-muted-foreground pl-6">{sale.lead.email}</p>
                  )}
                  {sale.lead.phone && (
                    <div className="flex items-center gap-2 pl-6">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{sale.lead.phone}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-green-500 hover:text-green-400"
                        onClick={openWhatsApp}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        WhatsApp
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Proposal Info */}
            {sale.proposal && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">Proposta Associada</Label>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Proposta de {format(new Date(sale.proposal.proposal_date), "d MMM yyyy", { locale: pt })}
                  </span>
                </div>
              </div>
            )}

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea
                placeholder="Adicionar notas sobre esta venda..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={handleNotesBlur}
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="pt-4">
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Venda
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar esta venda? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
