import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Search, FileText } from "lucide-react";
import { useAllPayments } from "@/hooks/useAllPayments";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { exportToExcel } from "@/lib/export";

export default function FinanceInvoices() {
  const { data: payments, isLoading } = useAllPayments();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter only payments with invoice reference
  const invoices = useMemo(() => {
    if (!payments) return [];

    const withInvoice = payments.filter(p => p.invoice_reference);

    if (!searchTerm) return withInvoice;

    const search = searchTerm.toLowerCase();
    return withInvoice.filter(payment => {
      const clientName = payment.client_name?.toLowerCase() || '';
      const leadName = payment.lead_name?.toLowerCase() || '';
      const saleCode = payment.sale.code?.toLowerCase() || '';
      const invoiceRef = payment.invoice_reference?.toLowerCase() || '';
      
      return invoiceRef.includes(search) ||
             clientName.includes(search) || 
             leadName.includes(search) || 
             saleCode.includes(search);
    });
  }, [payments, searchTerm]);

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

  return (
    <AppLayout>
      <div className="space-y-6 pb-20 md:pb-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/financeiro')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Faturas</h1>
              <p className="text-sm text-muted-foreground">
                Referências de faturas emitidas
              </p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por referência, cliente ou venda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

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
                <p className="text-xs text-muted-foreground mt-1">
                  As faturas aparecem quando adiciona uma referência ao registar pagamentos
                </p>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
