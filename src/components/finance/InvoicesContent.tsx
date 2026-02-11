import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, FileText, X, RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useInvoices, useSyncInvoices } from "@/hooks/useInvoices";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo, useEffect, useRef } from "react";
import { exportToExcel } from "@/lib/export";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditNotesContent } from "./CreditNotesContent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function InvoicesTable() {
  const { data: invoicesData, isLoading } = useInvoices();
  const syncInvoices = useSyncInvoices();
  const hasSynced = useRef(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Auto-sync on mount (once per session)
  useEffect(() => {
    if (!hasSynced.current && !syncInvoices.isPending) {
      hasSynced.current = true;
      syncInvoices.mutate();
    }
  }, []);

  const invoices = useMemo(() => {
    if (!invoicesData) return [];

    return invoicesData.filter(invoice => {
      if (dateRange?.from) {
        if (!invoice.date) return false;
        const invoiceDate = parseISO(invoice.date);
        if (invoiceDate < startOfDay(dateRange.from)) return false;
        if (dateRange.to && invoiceDate > endOfDay(dateRange.to)) return false;
      }

      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const ref = (invoice.reference || '').toLowerCase();
        const client = (invoice.client_name || '').toLowerCase();
        return ref.includes(search) || client.includes(search);
      }

      return true;
    });
  }, [invoicesData, searchTerm, dateRange]);

  const hasActiveFilters = searchTerm || dateRange?.from;

  const clearFilters = () => {
    setSearchTerm("");
    setDateRange(undefined);
  };

  const handleExport = () => {
    const exportData = invoices.map(inv => ({
      Referência: inv.reference || '-',
      Tipo: getDocTypeLabel(inv.document_type),
      Data: inv.date ? formatDate(inv.date) : '-',
      Cliente: inv.client_name || '-',
      Estado: getStatusLabel(inv.status),
      Valor: inv.total,
    }));
    exportToExcel(exportData, 'faturas');
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'invoice': return 'Fatura';
      case 'invoice_receipt': return 'Fatura-Recibo';
      case 'simplified_invoice': return 'Fatura Simplificada';
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
            Faturas importadas do InvoiceXpress
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncInvoices.mutate()}
            disabled={syncInvoices.isPending}
            className="gap-2"
          >
            {syncInvoices.isPending ? (
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
          {invoices.length} fatura(s) encontrada(s)
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
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhuma fatura encontrada</p>
              {hasActiveFilters ? (
                <Button variant="link" onClick={clearFilters} className="mt-2">Limpar filtros</Button>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  Clique em "Sincronizar" para importar faturas do InvoiceXpress
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
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center">Associada</TableHead>
                    <TableHead className="text-center w-[60px]">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.reference || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 whitespace-nowrap">
                          {getDocTypeLabel(invoice.document_type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {invoice.date ? formatDate(invoice.date) : '-'}
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {invoice.client_name || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusVariant(invoice.status)} className="text-xs">
                          {getStatusLabel(invoice.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatCurrency(invoice.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        {invoice.sale_id || invoice.payment_id ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-500 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {invoice.pdf_path ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(invoice.id, invoice.pdf_path)}
                            disabled={downloadingId === invoice.id}
                          >
                            {downloadingId === invoice.id ? (
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
    </div>
  );
}

export function InvoicesContent() {
  return (
    <Tabs defaultValue="faturas" className="space-y-6">
      <TabsList>
        <TabsTrigger value="faturas">Faturas</TabsTrigger>
        <TabsTrigger value="notas-credito">Notas de Crédito</TabsTrigger>
      </TabsList>
      <TabsContent value="faturas">
        <InvoicesTable />
      </TabsContent>
      <TabsContent value="notas-credito">
        <CreditNotesContent />
      </TabsContent>
    </Tabs>
  );
}
