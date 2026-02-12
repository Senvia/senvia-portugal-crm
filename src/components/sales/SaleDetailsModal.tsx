import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
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
import { useProducts } from "@/hooks/useProducts";
import { VatBadge, useVatCalculation, isInvoiceXpressActive as checkIxActive, getOrgTaxValue } from "./SaleFiscalInfo";
import { useProposalCpes } from "@/hooks/useProposalCpes";
import { formatCurrency } from "@/lib/format";
import { MODELO_SERVICO_LABELS, NEGOTIATION_TYPE_LABELS, SERVICOS_PRODUCTS } from "@/types/proposals";
import type { SaleWithDetails, SaleStatus } from "@/types/sales";
import { SALE_STATUS_LABELS, SALE_STATUS_COLORS, SALE_STATUSES } from "@/types/sales";
import { SalePaymentsList } from "./SalePaymentsList";
import { RecurringSection } from "./RecurringSection";
import { useSalePayments } from "@/hooks/useSalePayments";

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
  const { data: products } = useProducts();
  const { data: proposalCpes = [] } = useProposalCpes(sale?.proposal_id ?? undefined);
  const updateSale = useUpdateSale();
  const deleteSale = useDeleteSale();

  const { data: salePayments = [] } = useSalePayments(sale?.id);
  const hasPaidPayments = salePayments.some(p => p.status === 'paid');

  const hasInvoiceXpress = checkIxActive(organization);
  const orgTaxValue = getOrgTaxValue(organization);

  // VAT calculation for display
  const vatCalc = useVatCalculation({
    items: saleItems.map(i => ({ product_id: i.product_id, quantity: i.quantity, unit_price: i.unit_price })),
    products,
    orgTaxValue,
    discount: sale?.discount || 0,
    subtotal: sale?.subtotal || 0,
  });

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
    const phone = sale.client?.phone || sale.lead?.phone;
    if (phone) {
      const cleaned = phone.replace(/\D/g, "");
      window.open(`https://wa.me/${cleaned}`, "_blank");
    }
  };

  // Check if has energy or service data
  const hasEnergyData = sale.proposal_type === 'energia' && (
    sale.consumo_anual || sale.margem || sale.dbl || sale.anos_contrato || sale.comissao || sale.negotiation_type
  );
  const hasServiceData = sale.proposal_type === 'servicos' && (
    sale.modelo_servico || sale.kwp || sale.comissao || (sale.servicos_produtos && sale.servicos_produtos.length > 0)
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
              {/* 1. Client/Lead Info */}
              {(sale.client || sale.lead) && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-muted-foreground">Cliente</Label>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sale.client?.name || sale.lead?.name}</span>
                        {sale.client?.code && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {sale.client.code}
                          </Badge>
                        )}
                      </div>

                      {(sale.client?.nif || sale.client?.company) && (
                        <div className="grid grid-cols-2 gap-2">
                          {sale.client?.nif && (
                            <div>
                              <p className="text-xs text-muted-foreground">NIF</p>
                              <p className="text-sm font-medium font-mono">{sale.client.nif}</p>
                            </div>
                          )}
                          {sale.client?.company && (
                            <div>
                              <p className="text-xs text-muted-foreground">Empresa</p>
                              <p className="text-sm font-medium">{sale.client.company}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {(sale.client?.email || sale.lead?.email) && (
                        <div>
                          <p className="text-xs text-muted-foreground">Email</p>
                          <p className="text-sm">{sale.client?.email || sale.lead?.email}</p>
                        </div>
                      )}

                      {(sale.client?.phone || sale.lead?.phone) && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{sale.client?.phone || sale.lead?.phone}</span>
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

                      {(sale.client?.address_line1 || sale.client?.city || sale.client?.postal_code) && (
                        <div>
                          <p className="text-xs text-muted-foreground">Morada</p>
                          <div className="text-sm">
                            {sale.client?.address_line1 && <p>{sale.client.address_line1}</p>}
                            {sale.client?.address_line2 && <p>{sale.client.address_line2}</p>}
                            {(sale.client?.postal_code || sale.client?.city) && (
                              <p>
                                {[sale.client?.postal_code, sale.client?.city].filter(Boolean).join(' ')}
                              </p>
                            )}
                            {sale.client?.country && sale.client.country !== 'Portugal' && (
                              <p>{sale.client.country}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* 2. Status */}
              <div className="space-y-2">
                <Label>Estado da Venda</Label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className={cn('border', SALE_STATUS_COLORS[status])}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SALE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', SALE_STATUS_COLORS[s])}>
                          {SALE_STATUS_LABELS[s]}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* 3. Telecom: Energy Data */}
              {isTelecom && hasEnergyData && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <Label className="text-muted-foreground">Dados de Energia</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30">
                      {sale.negotiation_type && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Tipo de Negociação</p>
                          <p className="text-sm font-medium">
                            {NEGOTIATION_TYPE_LABELS[sale.negotiation_type as keyof typeof NEGOTIATION_TYPE_LABELS] || sale.negotiation_type}
                          </p>
                        </div>
                      )}
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

              {/* 3b. Telecom: Service Data */}
              {isTelecom && hasServiceData && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-blue-500" />
                      <Label className="text-muted-foreground">Dados do Serviço</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/30">
                      {sale.negotiation_type && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Tipo de Negociação</p>
                          <p className="text-sm font-medium">
                            {NEGOTIATION_TYPE_LABELS[sale.negotiation_type as keyof typeof NEGOTIATION_TYPE_LABELS] || sale.negotiation_type}
                          </p>
                        </div>
                      )}
                      {sale.servicos_produtos && sale.servicos_produtos.length > 0 && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Serviços/Produtos</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sale.servicos_produtos.map((s) => (
                              <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
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

              {/* 3c. Telecom: CPEs */}
              {isTelecom && proposalCpes.length > 0 && (
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

              {/* 4. Sale Items / Products */}
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
                            <div className="flex items-center gap-1.5">
                              <p className="font-medium text-sm">{item.name}</p>
                              {hasInvoiceXpress && <VatBadge taxValue={vatCalc.getItemTaxRate(item.product_id)} />}
                            </div>
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

              {/* 5. Total Value */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-muted-foreground">
                  {hasInvoiceXpress ? 'Valor Total (s/ IVA)' : 'Valor Total'}
                </p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(sale.total_value)}</p>
                {hasInvoiceXpress && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-primary/10">
                    <span className="text-xs text-muted-foreground">IVA: {formatCurrency(vatCalc.totalVat)}</span>
                    <span className="text-sm font-semibold">c/ IVA: {formatCurrency(vatCalc.totalWithVat)}</span>
                  </div>
                )}
              </div>

              <Separator />

              {/* 6. Proposal Info */}
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

              {/* 7. Recurring Section */}
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

              {/* 8. Payments Section (hidden for telecom) */}
              {!isTelecom && organization && (
                <>
                  <SalePaymentsList
                    saleId={sale.id}
                    organizationId={organization.id}
                    saleTotal={sale.total_value}
                    readonly={false}
                    hasInvoiceXpress={hasInvoiceXpress}
                    invoicexpressId={sale.invoicexpress_id}
                    invoicexpressType={sale.invoicexpress_type}
                    invoiceReference={sale.invoice_reference}
                    invoiceQrCodeUrl={(sale as any).qr_code_url}
                    invoicePdfUrl={(sale as any).invoice_pdf_url}
                    clientNif={sale.client?.nif}
                    clientName={sale.client?.name || sale.lead?.name}
                    clientEmail={sale.client?.email || sale.lead?.email}
                    taxConfig={organization?.tax_config as { tax_value?: number; tax_exemption_reason?: string } | null}
                    creditNoteId={sale.credit_note_id}
                  />
                  <Separator />
                </>
              )}

              {/* 9. Observations */}
              <div className="space-y-2">
                <Label>Observações da Negociação</Label>
                <Textarea
                  placeholder="Adicionar observações sobre esta venda..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="p-4 border-t border-border/50">
            <div className="flex gap-3">
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
