import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, FileText, X, RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useInvoices, useSyncInvoices } from "@/hooks/useInvoices";
import { useCreditNotes, useSyncCreditNotes } from "@/hooks/useCreditNotes";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useEffect, useRef } from "react";
import { exportToExcel } from "@/lib/export";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InvoiceDetailsModal } from "@/components/sales/InvoiceDetailsModal";
import { useAuth } from "@/contexts/AuthContext";

interface UnifiedDocument {
  id: string;
  reference: string | null;
  document_type: string;
  date: string | null;
  client_name: string | null;
  status: string | null;
  total: number;
  sale_id: string | null;
  payment_id: string | null;
  pdf_path: string | null;
  invoicexpress_id: number;
  related_doc_reference: string | null;
}

export function InvoicesContent() {
  const { data: invoicesData, isLoading: loadingInvoices } = useInvoices();
  const { data: creditNotesData, isLoading: loadingCreditNotes } = useCreditNotes();
  const { organization } = useAuth();
  const syncInvoices = useSyncInvoices();
  const syncCreditNotes = useSyncCreditNotes();
  const hasSynced = useRef(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<{
    invoicexpress_id: number;
    document_type: "invoice" | "invoice_receipt" | "receipt" | "credit_note";
    sale_id?: string;
    payment_id?: string;
  } | null>(null);

  const isLoading = loadingInvoices || loadingCreditNotes;

  // Auto-sync both on mount
  useEffect(() => {
    if (!hasSynced.current && !syncInvoices.isPending && !syncCreditNotes.isPending) {
      hasSynced.current = true;
      syncInvoices.mutate();
      syncCreditNotes.mutate();
    }
  }, []);

  const handleSync = () => {
    syncInvoices.mutate();
    syncCreditNotes.mutate();
  };

  const isSyncing = syncInvoices.isPending || syncCreditNotes.isPending;

  // Combine invoices + credit notes into unified list
  const allDocuments = useMemo((): UnifiedDocument[] => {
    const invoices: UnifiedDocument[] = (invoicesData || []).map(inv => ({
      id: inv.id,
      reference: inv.reference,
      document_type: inv.document_type || 'invoice',
      date: inv.date,
      client_name: inv.client_name,
      status: inv.status,
      total: inv.total,
      sale_id: inv.sale_id,
      payment_id: inv.payment_id,
      pdf_path: inv.pdf_path,
      invoicexpress_id: inv.invoicexpress_id,
      related_doc_reference: inv.credit_note_reference || null,
    }));

    const creditNotes: UnifiedDocument[] = (creditNotesData || []).map(cn => ({
      id: cn.id,
      reference: cn.reference,
      document_type: 'credit_note',
      date: cn.date,
      client_name: cn.client_name,
      status: cn.status,
      total: cn.total,
      sale_id: cn.sale_id,
      payment_id: cn.payment_id,
      pdf_path: cn.pdf_path,
      invoicexpress_id: cn.invoicexpress_id,
      related_doc_reference: cn.related_invoice_reference || null,
    }));

    return [...invoices, ...creditNotes].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    });
  }, [invoicesData, creditNotesData]);

  const filteredDocuments = useMemo(() => {
    return allDocuments.filter(doc => {
      if (dateRange?.from) {
        if (!doc.date) return false;
        const docDate = parseISO(doc.date);
        if (docDate < startOfDay(dateRange.from)) return false;
        if (dateRange.to && docDate > endOfDay(dateRange.to)) return false;
      }
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const ref = (doc.reference || '').toLowerCase();
        const client = (doc.client_name || '').toLowerCase();
        return ref.includes(search) || client.includes(search);
      }
      return true;
    });
  }, [allDocuments, searchTerm, dateRange]);

  const hasActiveFilters = searchTerm || dateRange?.from;

  const clearFilters = () => {
    setSearchTerm("");
    setDateRange(undefined);
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'invoice': return 'Fatura';
      case 'invoice_receipt': return 'Fatura-Recibo';
      case 'simplified_invoice': return 'Fatura Simplificada';
      case 'credit_note': return 'Nota de Crédito';
      default: return type;
    }
  };

  const getStatusLabel = (status: string | null) => {
    const map: Record<string, string> = {
      settled: 'Liquidada',
      final: 'Finalizada',
      draft: 'Rascunho',
      canceled: 'Anulada',
      sent: 'Enviada',
      second_copy: 'Segunda Via',
    };
    return map[status || ''] || status || '-';
  };

  const getStatusVariant = (status: string | null): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'settled': return 'default';
      case 'canceled': return 'destructive';
      case 'draft': return 'secondary';
      default: return 'outline';
    }
  };

  const handleExport = () => {
    const exportData = filteredDocuments.map(doc => ({
      Referência: doc.reference || '-',
      Tipo: getDocTypeLabel(doc.document_type),
      Data: doc.date ? formatDate(doc.date) : '-',
      Cliente: doc.client_name || '-',
      Estado: getStatusLabel(doc.status),
      Valor: doc.total,
    }));
    exportToExcel(exportData, 'documentos-fiscais');
  };

  const handleDownload = async (id: string, pdfPath: string | null) => {
    if (!pdfPath) return;
    setDownloadingId(id);
    try {
      if (pdfPath.startsWith('http')) {
        window.open(pdfPath, '_blank');
        return;
      }
      const { data, error } = await supabase.storage
        .from('invoices')
        .createSignedUrl(pdfPath, 60);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Faturas</h2>
          <p className="text-sm text-muted-foreground">
            Documentos fiscais importados do InvoiceXpress
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="gap-2"
          >
            {isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Sincronizar</span>
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por referência ou cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Período"
                className="w-full xs:w-auto"
              />
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {hasActiveFilters && !isLoading && (
        <p className="text-sm text-muted-foreground">
          {filteredDocuments.length} documento(s) encontrado(s)
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum documento encontrado</p>
              {hasActiveFilters ? (
                <Button variant="link" onClick={clearFilters} className="mt-2">Limpar filtros</Button>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em "Sincronizar" para importar documentos do InvoiceXpress
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referência</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-center">Doc. Relacionado</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Associada</TableHead>
                    <TableHead className="text-center w-[60px]">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow
                      key={doc.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedInvoice({
                        invoicexpress_id: doc.invoicexpress_id,
                        document_type: (doc.document_type || 'invoice') as any,
                        sale_id: doc.sale_id || undefined,
                        payment_id: doc.payment_id || undefined,
                      })}
                    >
                      <TableCell className="font-medium">
                        {doc.reference || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 whitespace-nowrap">
                          {getDocTypeLabel(doc.document_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {doc.date ? formatDate(doc.date) : '-'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {doc.client_name || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusVariant(doc.status)} className="text-xs">
                          {getStatusLabel(doc.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.related_doc_reference ? (
                          <Badge variant="outline" className="text-xs">
                            {doc.related_doc_reference}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatCurrency(doc.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.sale_id || doc.payment_id ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {doc.pdf_path ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); handleDownload(doc.id, doc.pdf_path); }}
                            disabled={downloadingId === doc.id}
                          >
                            {downloadingId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
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

      {selectedInvoice && organization && (
        <InvoiceDetailsModal
          open={!!selectedInvoice}
          onOpenChange={(open) => !open && setSelectedInvoice(null)}
          documentId={selectedInvoice.invoicexpress_id}
          documentType={selectedInvoice.document_type}
          organizationId={organization.id}
          saleId={selectedInvoice.sale_id}
          paymentId={selectedInvoice.payment_id}
        />
      )}
    </div>
  );
}
