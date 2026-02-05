import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, FileText, Loader2, X } from "lucide-react";
import { useAllPayments } from "@/hooks/useAllPayments";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useMemo } from "react";
import { exportToExcel } from "@/lib/export";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, parseISO } from "date-fns";

export function InvoicesContent() {
  const { data: payments, isLoading } = useAllPayments();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Filter only payments with invoice reference
  const invoices = useMemo(() => {
    if (!payments) return [];

    const withInvoice = payments.filter(p => p.invoice_reference);

    return withInvoice.filter(payment => {
      // Date range filter
      if (dateRange?.from) {
        const paymentDate = parseISO(payment.payment_date);
        if (paymentDate < startOfDay(dateRange.from)) return false;
        if (dateRange.to && paymentDate > endOfDay(dateRange.to)) return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const clientName = payment.client_name?.toLowerCase() || '';
        const leadName = payment.lead_name?.toLowerCase() || '';
        const saleCode = payment.sale.code?.toLowerCase() || '';
        const invoiceRef = payment.invoice_reference?.toLowerCase() || '';
        
        return invoiceRef.includes(search) ||
               clientName.includes(search) || 
               leadName.includes(search) || 
               saleCode.includes(search);
      }

      return true;
    });
  }, [payments, searchTerm, dateRange]);

  const hasActiveFilters = searchTerm || dateRange?.from;

  const clearFilters = () => {
    setSearchTerm("");
    setDateRange(undefined);
  };

  const handleExport = () => {
    const exportData = invoices.map(p => ({
      Referência: p.invoice_reference || '-',
      Data: formatDate(p.payment_date),
      Venda: `#${p.sale.code}`,
      Cliente: p.client_name || p.lead_name || '-',
      Valor: p.amount,
    }));
    exportToExcel(exportData, 'faturas');
  };

  const handleDownload = async (fileUrl: string, invoiceId: string) => {
    setDownloadingId(invoiceId);
    try {
      const { data, error } = await supabase.storage
        .from('invoices')
        .createSignedUrl(fileUrl, 60);

      if (error) {
        console.error('Error creating signed URL:', error);
        toast.error("Erro ao obter ficheiro");
        return;
      }

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Erro ao fazer download");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Export */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Referências de Faturas</h2>
          <p className="text-sm text-muted-foreground">
            Faturas associadas aos pagamentos registados
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por referência, cliente ou venda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Date range */}
            <div className="flex flex-wrap gap-3 items-center">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Período"
                className="w-full xs:w-auto"
              />

              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearFilters}
                  className="gap-1 text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results count */}
      {hasActiveFilters && !isLoading && (
        <p className="text-sm text-muted-foreground">
          {invoices.length} fatura(s) encontrada(s)
        </p>
      )}

      {/* Table */}
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
                <Button 
                  variant="link" 
                  onClick={clearFilters} 
                  className="mt-2"
                >
                  Limpar filtros
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  As faturas aparecem quando adiciona uma referência ao registar pagamentos
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referência</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Venda</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-center w-[60px]">Anexo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <span className="font-medium">{invoice.invoice_reference}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(invoice.payment_date)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">#{invoice.sale.code}</span>
                      </TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {invoice.client_name || invoice.lead_name || '-'}
                      </TableCell>
                      <TableCell className="text-right font-semibold whitespace-nowrap">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {invoice.invoice_file_url ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDownload(invoice.invoice_file_url!, invoice.id)}
                            disabled={downloadingId === invoice.id}
                          >
                            {downloadingId === invoice.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
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
