import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, RefreshCw, Loader2 } from "lucide-react";
import { useCreditNotes } from "@/hooks/useCreditNotes";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSyncInvoice } from "@/hooks/useInvoiceDetails";

export function CreditNotesContent() {
  const { data: creditNotes, isLoading } = useCreditNotes();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const syncInvoice = useSyncInvoice();

  const handleDownload = async (id: string, pdfUrl: string | null) => {
    if (!pdfUrl) return;
    setDownloadingId(id);
    try {
      const { data, error } = await supabase.storage
        .from('invoices')
        .createSignedUrl(pdfUrl, 60);

      if (error) {
        toast.error("Erro ao obter ficheiro");
        return;
      }
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch {
      toast.error("Erro ao fazer download");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSync = (item: NonNullable<typeof creditNotes>[0]) => {
    syncInvoice.mutate({
      documentId: item.credit_note_id,
      documentType: 'credit_note' as any,
      organizationId: item.organization_id,
      saleId: item.sale_id,
      paymentId: item.type === 'payment' ? item.id : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Notas de Crédito</h2>
        <p className="text-sm text-muted-foreground">
          Notas de crédito emitidas via InvoiceXpress
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : !creditNotes?.length ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma nota de crédito encontrada</p>
              <p className="text-xs text-muted-foreground mt-1">
                As notas de crédito aparecem quando emitidas a partir de uma fatura
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referência NC</TableHead>
                    <TableHead>Doc. Original</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Venda</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center w-[100px]">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditNotes.map((cn) => (
                    <TableRow key={`${cn.type}-${cn.id}`}>
                      <TableCell className="font-medium">
                        {cn.credit_note_reference}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {cn.original_document_reference || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(cn.date)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">#{cn.sale_code}</span>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {cn.client_name || '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatCurrency(cn.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {cn.pdf_url ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(cn.id, cn.pdf_url)}
                            disabled={downloadingId === cn.id}
                          >
                            {downloadingId === cn.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleSync(cn)}
                            disabled={syncInvoice.isPending}
                          >
                            <RefreshCw className={`h-4 w-4 ${syncInvoice.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
