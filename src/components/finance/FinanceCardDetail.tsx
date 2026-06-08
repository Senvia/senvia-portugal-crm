import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentWithSale } from "@/types/finance";
import {
  SALE_STATUS_LABELS, SALE_STATUS_COLORS,
  PAYMENT_RECORD_STATUS_LABELS, PAYMENT_RECORD_STATUS_COLORS,
  PAYMENT_METHOD_LABELS,
} from "@/types/sales";
import { useSales } from "@/hooks/useSales";
import { useExpenses } from "@/hooks/useExpenses";
import { MinhasComissoesContent } from "@/components/finance/MinhasComissoesContent";

export type FinanceDetailType =
  | "faturado" | "received" | "pending" | "overdue" | "dueSoon" | "expenses" | "balance" | "myCommissions";

interface FinanceCardDetailProps {
  type: FinanceDetailType;
  dateRange?: DateRange;
  payments: PaymentWithSale[];
  dueSoonPayments: PaymentWithSale[];
  onBack: () => void;
}

const TITLES: Record<FinanceDetailType, string> = {
  faturado: "Total Faturado",
  received: "Recebido",
  pending: "Pendente",
  overdue: "Atrasados",
  dueSoon: "A Vencer (7 dias)",
  expenses: "Despesas",
  balance: "Balanço",
  myCommissions: "As Minhas Comissões",
};

function inRange(dateStr: string, dateRange?: DateRange) {
  if (!dateRange?.from) return true;
  const d = parseISO(dateStr);
  if (d < startOfDay(dateRange.from)) return false;
  if (dateRange.to && d > endOfDay(dateRange.to)) return false;
  return true;
}

function fmtDate(dateStr: string) {
  return format(parseISO(dateStr), "dd MMM yyyy", { locale: pt });
}

function TotalFooter({ count, total }: { count: number; total: number }) {
  return (
    <div className="flex justify-between border-t px-4 py-2 text-sm font-medium">
      <span>Total ({count})</span>
      <span>{formatCurrency(total)}</span>
    </div>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <TableRow>
      <TableCell colSpan={cols} className="h-24 text-center text-muted-foreground">
        Sem registos no período.
      </TableCell>
    </TableRow>
  );
}

function PaymentsDetailTable({ payments }: { payments: PaymentWithSale[] }) {
  const total = payments.reduce((s, p) => s + p.amount, 0);
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Venda</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden sm:table-cell">Método</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <EmptyRow cols={6} />
          ) : (
            payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap">{fmtDate(p.payment_date)}</TableCell>
                <TableCell>{p.sale?.code || "—"}</TableCell>
                <TableCell>{p.client_name || p.lead_name || "—"}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {p.payment_method ? PAYMENT_METHOD_LABELS[p.payment_method] : "—"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(PAYMENT_RECORD_STATUS_COLORS[p.status])}>
                    {PAYMENT_RECORD_STATUS_LABELS[p.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(p.amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {payments.length > 0 && <TotalFooter count={payments.length} total={total} />}
    </div>
  );
}

function SalesDetailTable({ dateRange }: { dateRange?: DateRange }) {
  const { data: sales = [], isLoading } = useSales();
  const filtered = useMemo(
    () => sales.filter((s) => inRange(s.sale_date, dateRange)),
    [sales, dateRange],
  );
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const total = filtered.reduce((s, v) => s + (Number(v.total_value) || 0), 0);
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <EmptyRow cols={5} />
          ) : (
            filtered.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="whitespace-nowrap">{fmtDate(s.sale_date)}</TableCell>
                <TableCell>{s.client?.name || s.lead?.name || "—"}</TableCell>
                <TableCell>{s.code}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(SALE_STATUS_COLORS[s.status])}>
                    {SALE_STATUS_LABELS[s.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(s.total_value)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {filtered.length > 0 && <TotalFooter count={filtered.length} total={total} />}
    </div>
  );
}

function ExpensesDetailTable({ dateRange }: { dateRange?: DateRange }) {
  const { data: expenses = [], isLoading } = useExpenses();
  const filtered = useMemo(
    () => expenses.filter((e) => inRange(e.expense_date, dateRange)),
    [expenses, dateRange],
  );
  if (isLoading) return <Skeleton className="h-64 w-full" />;
  const total = filtered.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <EmptyRow cols={4} />
          ) : (
            filtered.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="whitespace-nowrap">{fmtDate(e.expense_date)}</TableCell>
                <TableCell>{e.description}</TableCell>
                <TableCell>{e.category?.name || "—"}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {filtered.length > 0 && <TotalFooter count={filtered.length} total={total} />}
    </div>
  );
}

function BalanceDetail({
  dateRange, received, receivedTotal,
}: { dateRange?: DateRange; received: PaymentWithSale[]; receivedTotal: number }) {
  const { data: expenses = [] } = useExpenses();
  const expensesTotal = useMemo(
    () => expenses.filter((e) => inRange(e.expense_date, dateRange)).reduce((s, e) => s + (Number(e.amount) || 0), 0),
    [expenses, dateRange],
  );
  const balance = receivedTotal - expensesTotal;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Recebido</p>
          <p className="text-xl font-bold text-emerald-600">{formatCurrency(receivedTotal)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Despesas</p>
          <p className="text-xl font-bold text-destructive">{formatCurrency(expensesTotal)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className={cn("text-xl font-bold", balance >= 0 ? "text-emerald-600" : "text-destructive")}>
            {formatCurrency(balance)}
          </p>
        </CardContent></Card>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Recebidos</h3>
        <PaymentsDetailTable payments={received} />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">Despesas</h3>
        <ExpensesDetailTable dateRange={dateRange} />
      </div>
    </div>
  );
}

export function FinanceCardDetail({ type, dateRange, payments, dueSoonPayments, onBack }: FinanceCardDetailProps) {
  const received = useMemo(() => payments.filter((p) => p.status === "paid"), [payments]);
  const pending = useMemo(() => payments.filter((p) => p.status === "pending"), [payments]);
  const overdue = useMemo(() => {
    const cutoff = startOfDay(new Date());
    return payments.filter((p) => p.status === "pending" && parseISO(p.payment_date) < cutoff);
  }, [payments]);
  const receivedTotal = useMemo(() => received.reduce((s, p) => s + p.amount, 0), [received]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <h2 className="text-lg font-semibold">{TITLES[type]}</h2>
      </div>

      {type === "faturado" && <SalesDetailTable dateRange={dateRange} />}
      {type === "received" && <PaymentsDetailTable payments={received} />}
      {type === "pending" && <PaymentsDetailTable payments={pending} />}
      {type === "overdue" && <PaymentsDetailTable payments={overdue} />}
      {type === "dueSoon" && <PaymentsDetailTable payments={dueSoonPayments} />}
      {type === "expenses" && <ExpensesDetailTable dateRange={dateRange} />}
      {type === "myCommissions" && <MinhasComissoesContent />}
      {type === "balance" && (
        <BalanceDetail dateRange={dateRange} received={received} receivedTotal={receivedTotal} />
      )}
    </div>
  );
}
