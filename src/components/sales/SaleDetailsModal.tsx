import { useState, useEffect } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { 
  User, 
  Calendar, 
  FileText, 
  Trash2, 
  MessageSquare, 
  Phone,
  Package,
  Zap,
  Wrench,
  Pencil
} from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateSale, useDeleteSale } from "@/hooks/useSales";
import { useSaleItems } from "@/hooks/useSaleItems";
import { useProposalCpes } from "@/hooks/useProposalCpes";
import { formatCurrency } from "@/lib/format";
import { MODELO_SERVICO_LABELS } from "@/types/proposals";
import type { SaleWithDetails, SaleStatus } from "@/types/sales";
import { SALE_STATUS_LABELS, SALE_STATUS_COLORS, SALE_STATUSES } from "@/types/sales";
import { SalePaymentsList } from "./SalePaymentsList";
import { RecurringSection } from "./RecurringSection";

interface SaleDetailsModalProps {
  sale: SaleWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (sale: SaleWithDetails) => void;
}

export function SaleDetailsModal({ sale, open, onOpenChange, onEdit }: SaleDetailsModalProps) {
  const [status, setStatus] = useState<SaleStatus>("pending");
  const [notes, setNotes] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { organization } = useAuth();
  const { data: saleItems = [] } = useSaleItems(sale?.id);
  const { data: proposalCpes = [] } = useProposalCpes(sale?.proposal_id ?? undefined);
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();

  // Conditional labels based on organization niche
  const isTelecom = organization?.niche === 'telecom';
  const cpeLabel = isTelecom ? 'CPE/CUI (Pontos de Consumo)' : 'CPEs (Equipamentos)';
  const serialLabel = isTelecom ? 'Local de Consumo' : 'Nº Série';

  useEffect(() => {
    if (sale) {
      setStatus(sale.status);
      setNotes(sale.notes || "");
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

  // Check if has energy or service data
  const hasEnergyData = sale.proposal_type === 'energia' && (
    sale.consumo_anual || sale.margem || sale.dbl || sale.anos_contrato || sale.comissao
  );
  const hasServiceData = sale.proposal_type === 'servicos' && (
    sale.modelo_servico || sale.kwp || sale.comissao
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0">
          <DialogHeader className="pl-6 pr-14 py-4 border-b border-border/50">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="flex items-center gap-2">
                {sale.code && (
                  <Badge variant="outline" className="font-mono text-xs">
                    {sale.code}
                  </Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={`${SALE_STATUS_COLORS[status]}`}
                >
                  {SALE_STATUS_LABELS[status]}
                </Badge>
              </DialogTitle>
              <span className="text-muted-foreground font-normal text-sm">
                {format(new Date(sale.created_at), "d MMM yyyy", { locale: pt })}
              </span>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-10rem)]">
            <div className="p-6 space-y-6">
              {/* Status */}
              <div className="space-y-2">
                <Label>Estado da Venda</Label>
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

              <Separator />

              {/* Energy Data Section */}
              {hasEnergyData && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <Label className="text-muted-foreground">Dados de Energia</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30">
                      {sale.consumo_anual && (
                        <div>
                          <p className="text-xs text-muted-foreground">Consumo Anual</p>
                          <p className="text-sm font-medium">
                            {sale.consumo_anual.toLocaleString('pt-PT')} kWh
                          </p>
                        </div>
                      )}
                      {sale.margem && (
                        <div>
                          <p className="text-xs text-muted-foreground">Margem</p>
                          <p className="text-sm font-medium">
                            {sale.margem.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €/MWh
                          </p>
                        </div>
                      )}
                      {sale.anos_contrato && (
                        <div>
                          <p className="text-xs text-muted-foreground">Contrato</p>
                          <p className="text-sm font-medium">
                            {sale.anos_contrato} {sale.anos_contrato === 1 ? 'ano' : 'anos'}
                          </p>
                        </div>
                      )}
                      {sale.dbl != null && (
                        <div>
                          <p className="text-xs text-muted-foreground">DBL</p>
                          <p className="text-sm font-medium">
                            {sale.dbl.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      )}
                      {sale.comissao && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Comissão</p>
                          <p className="text-sm font-medium text-green-500">
                            {formatCurrency(sale.comissao)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Service Data Section */}
              {hasServiceData && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-blue-500" />
                      <Label className="text-muted-foreground">Dados do Serviço</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30">
                      {sale.modelo_servico && (
                        <div>
                          <p className="text-xs text-muted-foreground">Modelo</p>
                          <p className="text-sm font-medium">
                            {MODELO_SERVICO_LABELS[sale.modelo_servico as keyof typeof MODELO_SERVICO_LABELS] || sale.modelo_servico}
                          </p>
                        </div>
                      )}
                      {sale.kwp && (
                        <div>
                          <p className="text-xs text-muted-foreground">Potência</p>
                          <p className="text-sm font-medium">
                            {sale.kwp.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} kWp
                          </p>
                        </div>
                      )}
                      {sale.comissao && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Comissão</p>
                          <p className="text-sm font-medium text-green-500">
                            {formatCurrency(sale.comissao)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* CPE/CUI Section */}
              {proposalCpes.length > 0 && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <Label className="text-muted-foreground">{cpeLabel}</Label>
                    </div>
                    <div className="space-y-2">
                      {proposalCpes.map((cpe) => (
                        <div
                          key={cpe.id}
                          className="p-3 rounded-lg border bg-muted/30 space-y-2"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {cpe.equipment_type}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {cpe.comercializador}
                            </Badge>
                            {cpe.existing_cpe_id ? (
                              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                                Renovação
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-500 border-green-500/30">
                                Novo
                              </Badge>
                            )}
                          </div>
                          {cpe.serial_number && (
                            <div>
                              <p className="text-xs text-muted-foreground">{serialLabel}</p>
                              <p className="text-sm font-mono">{cpe.serial_number}</p>
                            </div>
                          )}
                          {(cpe.fidelizacao_start || cpe.fidelizacao_end) && (
                            <div>
                              <p className="text-xs text-muted-foreground">Fidelização</p>
                              <p className="text-sm">
                                {cpe.fidelizacao_start 
                                  ? format(new Date(cpe.fidelizacao_start), "dd/MM/yyyy", { locale: pt })
                                  : '—'
                                }
                                {' → '}
                                {cpe.fidelizacao_end 
                                  ? format(new Date(cpe.fidelizacao_end), "dd/MM/yyyy", { locale: pt })
                                  : '—'
                                }
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Sale Items */}
              {saleItems.length > 0 && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-muted-foreground">Produtos/Serviços</Label>
                    </div>
                    <div className="space-y-2">
                      {saleItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                        >
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.quantity} × {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                          <p className="font-semibold">{formatCurrency(item.total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Client/Lead Info */}
              {(sale.client || sale.lead) && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-muted-foreground">Cliente</Label>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sale.client?.name || sale.lead?.name}</span>
                        {sale.client?.code && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {sale.client.code}
                          </Badge>
                        )}
                      </div>
                      {sale.lead?.email && (
                        <p className="text-sm text-muted-foreground">{sale.lead.email}</p>
                      )}
                      {sale.lead?.phone && (
                        <div className="flex items-center gap-2">
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
                  <Separator />
                </>
              )}

              {/* Proposal Info */}
              {sale.proposal && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-muted-foreground">Proposta Associada</Label>
                    </div>
                    <div className="flex items-center gap-2 text-sm p-3 bg-muted/30 rounded-lg">
                      {sale.proposal.code && (
                        <Badge variant="outline" className="font-mono text-xs">
                          {sale.proposal.code}
                        </Badge>
                      )}
                      <span>
                        {format(new Date(sale.proposal.proposal_date), "d MMM yyyy", { locale: pt })}
                      </span>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Recurring Section */}
              {sale.has_recurring && organization && (
                <>
                  <RecurringSection
                    saleId={sale.id}
                    organizationId={organization.id}
                    recurringValue={sale.recurring_value || 0}
                    recurringStatus={sale.recurring_status}
                    nextRenewalDate={sale.next_renewal_date}
                    lastRenewalDate={sale.last_renewal_date}
                  />
                  <Separator />
                </>
              )}

              {/* Payments Section */}
              {organization && (
                <>
                  <SalePaymentsList
                    saleId={sale.id}
                    organizationId={organization.id}
                    saleTotal={sale.total_value}
                    readonly={false}
                  />
                  <Separator />
                </>
              )}

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
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="p-4 border-t border-border/50 flex gap-3">
            {sale.status !== 'cancelled' && onEdit && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(sale);
                }}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar Venda
              </Button>
            )}
            <Button
              variant="destructive"
              className={sale.status !== 'cancelled' && onEdit ? "flex-1" : "w-full"}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar Venda
            </Button>
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
