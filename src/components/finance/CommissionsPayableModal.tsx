import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCommissionsDetail } from "@/hooks/useCommissionsDetail";
import { formatCurrency, formatDate } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Percent } from "lucide-react";

interface CommissionsPayableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommissionsPayableModal({ open, onOpenChange }: CommissionsPayableModalProps) {
  const { data, isLoading } = useCommissionsDetail();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-primary" />
            Comissões a Pagar
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : !data || data.byUser.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma comissão calculada para o período.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Grand total */}
            <div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total de Comissões</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(data.grandTotal)}</span>
            </div>

            {/* Table per user */}
            {data.byUser.map((user) => (
              <div key={user.userId} className="rounded-lg border overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                  <span className="font-medium text-sm">{user.fullName}</span>
                  <Badge variant="secondary">{formatCurrency(user.totalCommission)}</Badge>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Venda</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">%</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {user.sales.map((sale) => (
                      <TableRow key={sale.saleId}>
                        <TableCell className="font-mono text-xs">{sale.saleCode || "—"}</TableCell>
                        <TableCell className="text-xs">{formatDate(sale.saleDate)}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(sale.totalValue)}</TableCell>
                        <TableCell className="text-right text-sm">{sale.commissionRate}%</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(sale.commissionValue)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/30 font-medium">
                      <TableCell colSpan={2}>Subtotal</TableCell>
                      <TableCell className="text-right">{formatCurrency(user.totalSales)}</TableCell>
                      <TableCell />
                      <TableCell className="text-right">{formatCurrency(user.totalCommission)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
