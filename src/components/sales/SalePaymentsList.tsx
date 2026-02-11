import { useState } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { Plus, Pencil, Trash2, CreditCard, Receipt, AlertCircle, Download, Ban, FileText, QrCode, Mail, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { useSalePayments, useDeleteSalePayment, calculatePaymentSummary } from "@/hooks/useSalePayments";
import { useIssueInvoice } from "@/hooks/useIssueInvoice";
import { useIssueInvoiceReceipt } from "@/hooks/useIssueInvoiceReceipt";
import { useGenerateReceipt } from "@/hooks/useGenerateReceipt";
import { useCancelInvoice } from "@/hooks/useCancelInvoice";
import { useSaleItems } from "@/hooks/useSaleItems";
import { formatCurrency } from "@/lib/format";
import { AddPaymentModal } from "./AddPaymentModal";
import { ScheduleRemainingModal } from "./ScheduleRemainingModal";
import { PaymentTypeSelector } from "./PaymentTypeSelector";
import { InvoiceDraftModal } from "./InvoiceDraftModal";
import type { DraftSaleItem } from "./InvoiceDraftModal";
import { CancelInvoiceDialog } from "./CancelInvoiceDialog";
import type { SalePayment } from "@/types/sales";
import { 
  PAYMENT_METHOD_LABELS, 
  PAYMENT_RECORD_STATUS_LABELS,
  PAYMENT_RECORD_STATUS_COLORS 
} from "@/types/sales";

import { toast } from "sonner";
import { SendInvoiceEmailModal } from "./SendInvoiceEmailModal";
import { InvoiceDetailsModal } from "./InvoiceDetailsModal";
import { CreateCreditNoteModal } from "./CreateCreditNoteModal";
import { useSyncInvoice } from "@/hooks/useInvoiceDetails";

interface SalePaymentsListProps {
  saleId: string;
  organizationId: string;
  saleTotal: number;
  readonly?: boolean;
  hasInvoiceXpress?: boolean;
  invoicexpressId?: number | null;
  invoicexpressType?: string | null;
  invoiceReference?: string | null;
  invoiceQrCodeUrl?: string | null;
  invoicePdfUrl?: string | null;
  clientNif?: string | null;
  clientName?: string | null;
  clientEmail?: string | null;
  taxConfig?: { tax_value?: number; tax_exemption_reason?: string } | null;
}

export function SalePaymentsList({ 
  saleId, 
  organizationId,
  saleTotal, 
  readonly = false,
  hasInvoiceXpress = false,
  invoicexpressId,
  invoicexpressType,
  invoiceReference,
  invoiceQrCodeUrl,
  invoicePdfUrl,
  clientNif,
  clientName,
  clientEmail,
  taxConfig,
}: SalePaymentsListProps) {
  const { data: payments = [], isLoading } = useSalePayments(saleId);
  const { data: saleItemsData = [] } = useSaleItems(saleId);
  const deletePayment = useDeleteSalePayment();

  // Build draft items for InvoiceDraftModal
  const draftSaleItems: DraftSaleItem[] = saleItemsData.map((item: any) => ({
    name: item.name,
    quantity: Number(item.quantity),
    unit_price: Number(item.unit_price),
    tax_value: item.product?.tax_value ?? null,
  }));
  const issueInvoice = useIssueInvoice();
  const issueInvoiceReceipt = useIssueInvoiceReceipt();
  const generateReceipt = useGenerateReceipt();
  const cancelInvoice = useCancelInvoice();
  
  const [showTypeSelector, setShowTypeSelector] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<SalePayment | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<SalePayment | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [cancellingPayment, setCancellingPayment] = useState<SalePayment | null>(null);
  
  // Draft modal state - supports invoice (FT), receipt (RC), and invoice_receipt (FR)
  const [draftMode, setDraftMode] = useState<"invoice" | "receipt" | "invoice_receipt" | null>(null);
  const [draftPayment, setDraftPayment] = useState<SalePayment | null>(null);
  
  // Email modal state
  const [emailModal, setEmailModal] = useState<{
    documentId: number;
    documentType: "invoice" | "invoice_receipt" | "receipt";
    reference: string;
  } | null>(null);

  // Invoice details modal state
  const [detailsModal, setDetailsModal] = useState<{
    documentId: number;
    documentType: "invoice" | "invoice_receipt" | "receipt";
    paymentId?: string;
  } | null>(null);

  // Credit note modal state
  const [creditNoteModal, setCreditNoteModal] = useState<{
    documentId: number;
    documentType: "invoice" | "invoice_receipt" | "receipt";
    reference: string;
    saleId?: string;
    paymentId?: string;
  } | null>(null);

  const syncInvoice = useSyncInvoice();

  const summary = calculatePaymentSummary(payments, saleTotal);

  const handleDelete = () => {
    if (!deletingPayment) return;
    
    deletePayment.mutate(
      { paymentId: deletingPayment.id, saleId },
      { onSuccess: () => setDeletingPayment(null) }
    );
  };

  // Can emit invoice: InvoiceXpress active, no existing invoice, client has NIF
  const canEmitInvoice = hasInvoiceXpress && !invoicexpressId && !!clientNif;
  // Has invoice: sale already has invoicexpress_id
  const hasInvoice = !!invoicexpressId;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Pagamentos</span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-16 bg-muted/50 rounded-lg" />
          <div className="h-16 bg-muted/50 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Pagamentos</span>
            {payments.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {payments.length}
              </Badge>
            )}
          </div>
          {!readonly && summary.remaining > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTypeSelector(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>

        {/* Global Invoice Button */}
        {hasInvoiceXpress && !readonly && (
          <div className="p-3 rounded-lg border bg-muted/20 space-y-2">
            {hasInvoice ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="font-medium">Fatura: {invoiceReference}</span>
                </div>
                {invoicePdfUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => window.open(invoicePdfUrl, '_blank')}
                    title="Download PDF"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                )}
                {!invoicePdfUrl && invoicexpressId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => syncInvoice.mutate({
                      documentId: invoicexpressId,
                      documentType: (invoicexpressType === 'invoice_receipts' ? 'invoice_receipt' : 'invoice') as any,
                      organizationId,
                      saleId,
                    })}
                    disabled={syncInvoice.isPending}
                    title="Buscar PDF"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncInvoice.isPending ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                {invoicexpressId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setDetailsModal({
                      documentId: invoicexpressId,
                      documentType: (invoicexpressType === 'invoice_receipts' ? 'invoice_receipt' : 'invoice') as any,
                    })}
                    title="Ver detalhes"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}
                {invoiceQrCodeUrl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => window.open(invoiceQrCodeUrl, '_blank')}
                    title="Ver QR Code"
                  >
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                )}
                {invoicexpressId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEmailModal({
                      documentId: invoicexpressId,
                      documentType: (invoicexpressType === 'invoice_receipt' ? 'invoice_receipt' : 'invoice') as any,
                      reference: invoiceReference || '',
                    })}
                    title="Enviar por email"
                  >
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                )}
                {invoicexpressId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setCreditNoteModal({
                      documentId: invoicexpressId,
                      documentType: (invoicexpressType === 'invoice_receipts' ? 'invoice_receipt' : 'invoice') as any,
                      reference: invoiceReference || '',
                      saleId,
                    })}
                    title="Nota de Crédito"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    NC
                  </Button>
                )}
                {invoicexpressId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={() => {
                      setCancellingPayment({
                        id: '__sale__',
                        invoicexpress_id: invoicexpressId,
                        invoice_reference: invoiceReference || '',
                      } as any);
                    }}
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    Anular
                  </Button>
                )}
              </div>
            ) : canEmitInvoice ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setDraftMode("invoice")}
              >
                <FileText className="h-4 w-4 mr-1" />
                Emitir Fatura ({formatCurrency(saleTotal)})
              </Button>
            ) : hasInvoiceXpress && !clientNif ? (
              <p className="text-xs text-muted-foreground text-center">
                Adicione o NIF do cliente para emitir fatura
              </p>
            ) : null}
          </div>
        )}

        {/* Payments List */}
        {payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {formatCurrency(Number(payment.amount))}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${PAYMENT_RECORD_STATUS_COLORS[payment.status]}`}
                    >
                      {PAYMENT_RECORD_STATUS_LABELS[payment.status]}
                    </Badge>
                    {payment.payment_method && (
                      <Badge variant="secondary" className="text-xs">
                        {PAYMENT_METHOD_LABELS[payment.payment_method]}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(payment.payment_date), "d MMM yyyy", { locale: pt })}
                    </span>
                    {payment.invoice_reference && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Receipt className="h-3 w-3" />
                          {payment.invoice_reference}
                        </span>
                      </>
                    )}
                  </div>
                  {payment.notes && (
                    <p className="text-xs text-muted-foreground truncate">
                      {payment.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {!readonly && payment.status !== 'paid' && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingPayment(payment)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeletingPayment(payment)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  {/* Generate Receipt (RC) or Invoice-Receipt (FR) button */}
                  {payment.status === 'paid' && hasInvoiceXpress && !payment.invoice_reference && !readonly && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => {
                        setDraftPayment(payment);
                        setDraftMode(hasInvoice ? "receipt" : "invoice_receipt");
                      }}
                    >
                      <Receipt className="h-3 w-3 mr-1" />
                      {hasInvoice ? "Gerar Recibo (RC)" : "Fatura-Recibo (FR)"}
                    </Button>
                  )}
                  {payment.qr_code_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(payment.qr_code_url!, '_blank')}
                      title="Ver QR Code"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {payment.invoice_file_url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => window.open(payment.invoice_file_url!, '_blank')}
                      title="Download PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {!payment.invoice_file_url && payment.invoicexpress_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => syncInvoice.mutate({
                        documentId: payment.invoicexpress_id!,
                        documentType: 'receipt',
                        organizationId,
                        saleId,
                        paymentId: payment.id,
                      })}
                      disabled={syncInvoice.isPending}
                      title="Buscar PDF"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncInvoice.isPending ? 'animate-spin' : ''}`} />
                    </Button>
                  )}
                  {payment.invoicexpress_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setDetailsModal({
                        documentId: payment.invoicexpress_id!,
                        documentType: 'receipt',
                        paymentId: payment.id,
                      })}
                      title="Ver detalhes"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {payment.invoice_reference && payment.invoicexpress_id && hasInvoiceXpress && !readonly && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEmailModal({
                          documentId: payment.invoicexpress_id!,
                          documentType: 'receipt',
                          reference: payment.invoice_reference!,
                        })}
                        title="Enviar por email"
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setCancellingPayment(payment)}
                        title="Anular recibo"
                      >
                        <Ban className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-dashed text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Nenhum pagamento registado
            </p>
            {!readonly && summary.remaining > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTypeSelector(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Pagamento
              </Button>
            )}
          </div>
        )}

        {/* Summary */}
        {saleTotal > 0 && (
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-medium">{Math.round(summary.percentage)}%</span>
              </div>
              <Progress value={summary.percentage} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total Pago</p>
                <p className="font-semibold text-primary">
                  {formatCurrency(summary.totalPaid)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Em Falta</p>
                <p className={`font-semibold ${summary.remaining > 0 ? 'text-destructive' : 'text-primary'}`}>
                  {formatCurrency(summary.remaining)}
                </p>
              </div>
            </div>

            {summary.totalScheduled > 0 && (
              <div className="pt-2 border-t text-sm">
                <p className="text-muted-foreground">Agendado</p>
                <p className="font-medium text-secondary-foreground">
                  {formatCurrency(summary.totalScheduled)}
                </p>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Type Selector */}
      <PaymentTypeSelector
        open={showTypeSelector}
        onOpenChange={setShowTypeSelector}
        remainingAmount={summary.remaining}
        onSelectTotal={() => {
          setShowTypeSelector(false);
          setShowAddModal(true);
        }}
        onSelectInstallments={() => {
          setShowTypeSelector(false);
          setShowScheduleModal(true);
        }}
      />

      {/* Add/Edit Modal */}
      <AddPaymentModal
        open={showAddModal || !!editingPayment}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddModal(false);
            setEditingPayment(null);
          }
        }}
        saleId={saleId}
        organizationId={organizationId}
        saleTotal={saleTotal}
        remaining={summary.remaining}
        payment={editingPayment}
        hasInvoiceXpress={hasInvoiceXpress}
      />

      {/* Schedule Remaining Modal */}
      <ScheduleRemainingModal
        open={showScheduleModal}
        onOpenChange={setShowScheduleModal}
        saleId={saleId}
        organizationId={organizationId}
        remainingAmount={Math.max(0, summary.remaining)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingPayment} onOpenChange={(open) => !open && setDeletingPayment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar este pagamento de{" "}
              <strong>{deletingPayment && formatCurrency(Number(deletingPayment.amount))}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              className="bg-destructive hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invoice Draft Modal - Invoice mode (sale total) */}
      <InvoiceDraftModal
        open={draftMode === "invoice"}
        onOpenChange={(open) => { if (!open) setDraftMode(null); }}
        onConfirm={() => {
          issueInvoice.mutate(
            { saleId, organizationId },
            { onSuccess: () => setDraftMode(null) }
          );
        }}
        isLoading={issueInvoice.isPending}
        mode="invoice"
        clientName={clientName}
        clientNif={clientNif}
        amount={saleTotal}
        paymentDate={new Date().toISOString()}
        taxConfig={taxConfig}
        saleItems={draftSaleItems}
        saleTotal={saleTotal}
      />

      {/* Invoice Draft Modal - Receipt mode (RC - requires existing FT) */}
      <InvoiceDraftModal
        open={draftMode === "receipt" && !!draftPayment}
        onOpenChange={(open) => { 
          if (!open) { setDraftMode(null); setDraftPayment(null); }
        }}
        onConfirm={() => {
          if (!draftPayment) return;
          generateReceipt.mutate(
            { saleId, paymentId: draftPayment.id, organizationId },
            { onSuccess: () => { setDraftMode(null); setDraftPayment(null); } }
          );
        }}
        isLoading={generateReceipt.isPending}
        mode="receipt"
        clientName={clientName}
        clientNif={clientNif}
        amount={draftPayment ? Number(draftPayment.amount) : 0}
        paymentDate={draftPayment?.payment_date || new Date().toISOString()}
        paymentMethod={draftPayment?.payment_method}
        taxConfig={taxConfig}
        saleItems={draftSaleItems}
        saleTotal={saleTotal}
      />

      {/* Invoice Draft Modal - Invoice Receipt mode (FR - standalone document) */}
      <InvoiceDraftModal
        open={draftMode === "invoice_receipt" && !!draftPayment}
        onOpenChange={(open) => { 
          if (!open) { setDraftMode(null); setDraftPayment(null); }
        }}
        onConfirm={() => {
          if (!draftPayment) return;
          issueInvoiceReceipt.mutate(
            { saleId, paymentId: draftPayment.id, organizationId },
            { onSuccess: () => { setDraftMode(null); setDraftPayment(null); } }
          );
        }}
        isLoading={issueInvoiceReceipt.isPending}
        mode="invoice_receipt"
        clientName={clientName}
        clientNif={clientNif}
        amount={draftPayment ? Number(draftPayment.amount) : 0}
        paymentDate={draftPayment?.payment_date || new Date().toISOString()}
        paymentMethod={draftPayment?.payment_method}
        taxConfig={taxConfig}
        saleItems={draftSaleItems}
        saleTotal={saleTotal}
      />

      {/* Cancel Invoice/Receipt Dialog */}
      <CancelInvoiceDialog
        open={!!cancellingPayment}
        onOpenChange={(open) => !open && setCancellingPayment(null)}
        onConfirm={(reason) => {
          if (!cancellingPayment) return;
          const isSaleInvoice = cancellingPayment.id === '__sale__';
          const docType = isSaleInvoice ? 'invoice' : 'receipt';
          cancelInvoice.mutate(
            {
              ...(isSaleInvoice 
                ? { saleId } 
                : { paymentId: cancellingPayment.id }),
              organizationId,
              reason,
              invoicexpressId: cancellingPayment.invoicexpress_id!,
              documentType: docType,
            },
            { onSuccess: () => setCancellingPayment(null) }
          );
        }}
        isLoading={cancelInvoice.isPending}
        invoiceReference={cancellingPayment?.invoice_reference || ""}
      />

      {/* Send Invoice Email Modal */}
      {emailModal && (
        <SendInvoiceEmailModal
          open={!!emailModal}
          onOpenChange={(open) => !open && setEmailModal(null)}
          documentId={emailModal.documentId}
          documentType={emailModal.documentType}
          organizationId={organizationId}
          reference={emailModal.reference}
          clientEmail={clientEmail}
        />
      )}

      {/* Invoice Details Modal */}
      {detailsModal && (
        <InvoiceDetailsModal
          open={!!detailsModal}
          onOpenChange={(open) => !open && setDetailsModal(null)}
          documentId={detailsModal.documentId}
          documentType={detailsModal.documentType}
          organizationId={organizationId}
          saleId={saleId}
          paymentId={detailsModal.paymentId}
        />
      )}

      {/* Credit Note Modal */}
      {creditNoteModal && (
        <CreateCreditNoteModal
          open={!!creditNoteModal}
          onOpenChange={(open) => !open && setCreditNoteModal(null)}
          organizationId={organizationId}
          saleId={creditNoteModal.saleId}
          paymentId={creditNoteModal.paymentId}
          documentId={creditNoteModal.documentId}
          documentType={creditNoteModal.documentType}
          documentReference={creditNoteModal.reference}
        />
      )}
    </>
  );
}
