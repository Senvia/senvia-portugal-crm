import { RefreshCw, ExternalLink, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInvoiceDetails, useSyncInvoice } from "@/hooks/useInvoiceDetails";
import { formatCurrency } from "@/lib/format";

interface InvoiceDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: number;
  documentType: "invoice" | "invoice_receipt" | "receipt";
  organizationId: string;
  saleId: string;
  paymentId?: string;
}

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  draft: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  final: { label: "Finalizada", className: "bg-green-500/20 text-green-500 border-green-500/30" },
  settled: { label: "Liquidada", className: "bg-blue-500/20 text-blue-500 border-blue-500/30" },
  cancelled: { label: "Anulada", className: "bg-red-500/20 text-red-500 border-red-500/30" },
  second_copy: { label: "2ª Via", className: "bg-amber-500/20 text-amber-500 border-amber-500/30" },
};

const TYPE_LABELS: Record<string, string> = {
  invoice: "Fatura",
  invoice_receipt: "Fatura-Recibo",
  receipt: "Recibo",
};

export function InvoiceDetailsModal({
  open,
  onOpenChange,
  documentId,
  documentType,
  organizationId,
  saleId,
  paymentId,
}: InvoiceDetailsModalProps) {
  const { data: details, isLoading, error } = useInvoiceDetails(
    { documentId, documentType, organizationId },
    open
  );
  const syncInvoice = useSyncInvoice();

  const handleSync = () => {
    syncInvoice.mutate({
      documentId,
      documentType,
      organizationId,
      saleId,
      paymentId,
    });
  };

  const statusInfo = details ? STATUS_MAP[details.status] || { label: details.status, className: "bg-muted text-muted-foreground" } : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0">
        <DialogHeader className="pl-6 pr-14 py-4 border-b border-border/50">
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>{TYPE_LABELS[documentType] || "Documento"}</span>
            {details?.sequence_number && (
              <Badge variant="outline" className="font-mono text-xs">
                {details.sequence_number}
              </Badge>
            )}
            {statusInfo && (
              <Badge variant="outline" className={statusInfo.className}>
                {statusInfo.label}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-10rem)]">
          <div className="p-6 space-y-5">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-sm text-destructive mb-2">Erro ao carregar detalhes</p>
                <p className="text-xs text-muted-foreground">{(error as Error).message}</p>
              </div>
            ) : details ? (
              <>
                {/* ATCUD & Date */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {details.atcud && (
                    <div>
                      <p className="text-xs text-muted-foreground">ATCUD</p>
                      <p className="font-mono font-medium">{details.atcud}</p>
                    </div>
                  )}
                  {details.date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Data</p>
                      <p className="font-medium">{details.date}</p>
                    </div>
                  )}
                  {details.due_date && details.due_date !== details.date && (
                    <div>
                      <p className="text-xs text-muted-foreground">Vencimento</p>
                      <p className="font-medium">{details.due_date}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Client */}
                {details.client && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Cliente</p>
                      <p className="text-sm font-medium">{details.client.name}</p>
                      {details.client.fiscal_id && (
                        <p className="text-xs text-muted-foreground">NIF: {details.client.fiscal_id}</p>
                      )}
                    </div>
                    <Separator />
                  </>
                )}

                {/* Items Table */}
                {details.items.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-medium">Itens</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Descrição</TableHead>
                          <TableHead className="text-xs text-right">Qtd</TableHead>
                          <TableHead className="text-xs text-right">Preço</TableHead>
                          <TableHead className="text-xs text-right">IVA</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {details.items.map((item, i) => (
                          <TableRow key={i}>
                            <TableCell className="text-xs py-2">{item.name}</TableCell>
                            <TableCell className="text-xs text-right py-2">{item.quantity}</TableCell>
                            <TableCell className="text-xs text-right py-2">{formatCurrency(Number(item.unit_price))}</TableCell>
                            <TableCell className="text-xs text-right py-2">{item.tax?.value ?? 0}%</TableCell>
                            <TableCell className="text-xs text-right py-2 font-medium">{formatCurrency(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                <Separator />

                {/* Financial Summary */}
                <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(details.before_taxes)}</span>
                  </div>
                  {details.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Desconto</span>
                      <span>-{formatCurrency(details.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IVA</span>
                    <span>{formatCurrency(details.taxes)}</span>
                  </div>
                  {details.tax_exemption && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Isenção</span>
                      <span className="text-xs">{details.tax_exemption}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="text-primary">{formatCurrency(details.total)}</span>
                  </div>
                </div>

                {/* Permalink */}
                {details.permalink && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(details.permalink, '_blank')}
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-2" />
                    Ver no InvoiceXpress
                  </Button>
                )}

                {/* PDF download if available from sync */}
                {details.pdf_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(details.pdf_url!, '_blank')}
                  >
                    <Download className="h-3.5 w-3.5 mr-2" />
                    Download PDF
                  </Button>
                )}
              </>
            ) : null}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border/50">
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={handleSync}
            disabled={syncInvoice.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-2 ${syncInvoice.isPending ? 'animate-spin' : ''}`} />
            {syncInvoice.isPending ? 'A sincronizar...' : 'Sincronizar Dados & PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
