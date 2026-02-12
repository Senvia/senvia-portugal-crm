import { useState } from "react";
import { MoreHorizontal, Eye, RefreshCw, Download, Mail, Ban, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSyncInvoice } from "@/hooks/useInvoiceDetails";
import { useCancelInvoice } from "@/hooks/useCancelInvoice";
import { CancelInvoiceDialog } from "@/components/sales/CancelInvoiceDialog";
import { SendInvoiceEmailModal } from "@/components/sales/SendInvoiceEmailModal";
import { InvoiceDetailsModal } from "@/components/sales/InvoiceDetailsModal";
import { CreateCreditNoteModal } from "@/components/sales/CreateCreditNoteModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { downloadFileFromUrl } from "@/lib/download";

interface InvoiceActionItem {
  id: string;
  invoicexpressId: number | null;
  invoiceReference: string;
  invoiceFileUrl: string | null;
  documentType: "invoice" | "invoice_receipt" | "receipt";
  saleId: string;
  paymentId?: string;
  clientEmail?: string | null;
  organizationId: string;
}

interface InvoiceActionsMenuProps {
  invoice: InvoiceActionItem;
}

export function InvoiceActionsMenu({ invoice }: InvoiceActionsMenuProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showCreditNote, setShowCreditNote] = useState(false);
  const [downloading, setDownloading] = useState(false);
  
  const syncInvoice = useSyncInvoice();
  const cancelInvoice = useCancelInvoice();

  const hasInvoiceXpress = !!invoice.invoicexpressId;
  const hasLocalPdf = !!invoice.invoiceFileUrl;

  const handleDownload = async () => {
    if (!invoice.invoiceFileUrl) return;
    const filename = `${invoice.invoiceReference || 'documento'}.pdf`;
    setDownloading(true);
    try {
      const { data, error } = await supabase.storage
        .from('invoices')
        .createSignedUrl(invoice.invoiceFileUrl, 60);
      if (error || !data?.signedUrl) {
        toast.error("Erro ao obter ficheiro");
        return;
      }
      await downloadFileFromUrl(data.signedUrl, filename);
    } catch {
      toast.error("Erro ao fazer download");
    } finally {
      setDownloading(false);
    }
  };

  const handleSync = () => {
    if (!invoice.invoicexpressId) return;
    syncInvoice.mutate({
      documentId: invoice.invoicexpressId,
      documentType: invoice.documentType,
      organizationId: invoice.organizationId,
      saleId: invoice.saleId,
      paymentId: invoice.paymentId,
    });
  };

  const handleCancelConfirm = (reason: string) => {
    if (!invoice.invoicexpressId) return;
    const isSaleLevel = !invoice.paymentId;
    cancelInvoice.mutate(
      {
        ...(isSaleLevel ? { saleId: invoice.saleId } : { paymentId: invoice.paymentId }),
        organizationId: invoice.organizationId,
        reason,
        invoicexpressId: invoice.invoicexpressId,
        documentType: invoice.documentType,
      },
      { onSuccess: () => setShowCancel(false) }
    );
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {hasInvoiceXpress && (
            <DropdownMenuItem onClick={() => setShowDetails(true)}>
              <Eye className="h-4 w-4 mr-2" />
              Ver Detalhes
            </DropdownMenuItem>
          )}

          {hasLocalPdf ? (
            <DropdownMenuItem onClick={handleDownload} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Download PDF
            </DropdownMenuItem>
          ) : hasInvoiceXpress ? (
            <DropdownMenuItem onClick={handleSync} disabled={syncInvoice.isPending}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncInvoice.isPending ? 'animate-spin' : ''}`} />
              Sincronizar PDF
            </DropdownMenuItem>
          ) : null}

          {hasInvoiceXpress && (
            <DropdownMenuItem onClick={() => setShowEmail(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Enviar por Email
            </DropdownMenuItem>
          )}

          {hasInvoiceXpress && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowCreditNote(true)}>
                <FileText className="h-4 w-4 mr-2" />
                Nota de Crédito
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowCancel(true)}
                className="text-destructive focus:text-destructive"
              >
                <Ban className="h-4 w-4 mr-2" />
                Anular Documento
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Modals */}
      {showDetails && invoice.invoicexpressId && (
        <InvoiceDetailsModal
          open={showDetails}
          onOpenChange={setShowDetails}
          documentId={invoice.invoicexpressId}
          documentType={invoice.documentType}
          organizationId={invoice.organizationId}
          saleId={invoice.saleId}
          paymentId={invoice.paymentId}
        />
      )}

      <CancelInvoiceDialog
        open={showCancel}
        onOpenChange={setShowCancel}
        onConfirm={handleCancelConfirm}
        isLoading={cancelInvoice.isPending}
        invoiceReference={invoice.invoiceReference}
      />

      {showEmail && invoice.invoicexpressId && (
        <SendInvoiceEmailModal
          open={showEmail}
          onOpenChange={setShowEmail}
          documentId={invoice.invoicexpressId}
          documentType={invoice.documentType}
          organizationId={invoice.organizationId}
          reference={invoice.invoiceReference}
          clientEmail={invoice.clientEmail}
        />
      )}

      {showCreditNote && invoice.invoicexpressId && (
        <CreateCreditNoteModal
          open={showCreditNote}
          onOpenChange={setShowCreditNote}
          organizationId={invoice.organizationId}
          saleId={invoice.saleId}
          paymentId={invoice.paymentId}
          documentId={invoice.invoicexpressId}
          documentType={invoice.documentType}
          documentReference={invoice.invoiceReference}
        />
      )}
    </>
  );
}