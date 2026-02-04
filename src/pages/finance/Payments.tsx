import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Search, CreditCard } from "lucide-react";
import { useAllPayments } from "@/hooks/useAllPayments";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { PAYMENT_METHOD_LABELS, PAYMENT_RECORD_STATUS_LABELS } from "@/types/sales";
import { exportToExcel } from "@/lib/export";

export default function FinancePayments() {
  const { data: payments, isLoading } = useAllPayments();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredPayments = useMemo(() => {
    if (!payments) return [];

    return payments.filter(payment => {
      // Status filter
      if (statusFilter !== "all" && payment.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const clientName = payment.client_name?.toLowerCase() || '';
        const leadName = payment.lead_name?.toLowerCase() || '';
        const saleCode = payment.sale.code?.toLowerCase() || '';
        const invoiceRef = payment.invoice_reference?.toLowerCase() || '';
        
        return clientName.includes(search) || 
               leadName.includes(search) || 
               saleCode.includes(search) ||
               invoiceRef.includes(search);
      }

      return true;
    });
  }, [payments, searchTerm, statusFilter]);

  const handleExport = () => {
    const exportData = filteredPayments.map(p => ({
      Data: formatDate(p.payment_date),
      Venda: `#${p.sale.code}`,
      Cliente: p.client_name || p.lead_name || '-',
      Valor: p.amount,
      Método: p.payment_method ? PAYMENT_METHOD_LABELS[p.payment_method] : '-',
      Fatura: p.invoice_reference || '-',
      Estado: PAYMENT_RECORD_STATUS_LABELS[p.status],
    }));
    exportToExcel(exportData, 'pagamentos');
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
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Pagamentos</h1>
              <p className="text-sm text-muted-foreground">
                Histórico de todos os pagamentos
              </p>
            </div>
          </div>
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por cliente, venda ou fatura..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pagos</SelectItem>
                  <SelectItem value="pending">Agendados</SelectItem>
                </SelectContent>
              </Select>
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
            ) : filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhum pagamento encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Venda</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="hidden sm:table-cell">Método</TableHead>
                      <TableHead className="hidden md:table-cell">Fatura</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDate(payment.payment_date)}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">#{payment.sale.code}</span>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {payment.client_name || payment.lead_name || '-'}
                        </TableCell>
                        <TableCell className="text-right font-semibold whitespace-nowrap">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {payment.payment_method ? PAYMENT_METHOD_LABELS[payment.payment_method] : '-'}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {payment.invoice_reference || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={payment.status === 'paid' ? 'default' : 'secondary'}
                            className={payment.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}
                          >
                            {PAYMENT_RECORD_STATUS_LABELS[payment.status]}
                          </Badge>
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
