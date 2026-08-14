import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/format';
import {
  useSaleCheckout,
  useSaleRecurrence,
  type BillingStatus,
  type CycleStatus,
  type ServiceStatus,
} from '@/hooks/useSaleRecurrence';

// Serviço e cobrança são apresentados como dois crachás separados, e não como um
// estado único, porque são mesmo coisas diferentes: um cliente pode estar em
// atraso e continuar a receber o serviço. Fundi-los num só rótulo era o que
// levava alguém a olhar para "Ativo" e concluir que estava tudo pago.
const SERVICE_LABEL: Record<ServiceStatus, string> = {
  pending: 'Por iniciar',
  active: 'Ativo',
  paused: 'Em pausa',
  inactive: 'Inativo',
  cancelled: 'Cancelado',
};

const BILLING_LABEL: Record<BillingStatus, string> = {
  not_started: 'Sem cobrança',
  current: 'Em dia',
  past_due: 'Em atraso',
  uncollectible: 'Incobrável',
};

const CYCLE_LABEL: Record<CycleStatus, string> = {
  pending: 'Por liquidar',
  paid: 'Liquidado',
  failed: 'Falhou',
  void: 'Anulado',
};

function serviceTone(status: ServiceStatus): string {
  if (status === 'active') return 'bg-green-500/10 text-green-600 border-green-500/20';
  if (status === 'cancelled' || status === 'inactive') return 'bg-muted/50 text-muted-foreground';
  return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
}

function billingTone(status: BillingStatus): string {
  if (status === 'current') return 'bg-green-500/10 text-green-600 border-green-500/20';
  if (status === 'not_started') return 'bg-muted/50 text-muted-foreground';
  return 'bg-red-500/10 text-red-600 border-red-500/20';
}

function CycleIcon({ status }: { status: CycleStatus }) {
  if (status === 'paid') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
  if (status === 'failed') return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === 'void') return <XCircle className="h-4 w-4 text-muted-foreground" />;
  return <Clock className="h-4 w-4 text-amber-600" />;
}

function monthLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
}

export function RecurringSalePanel({ saleId }: { saleId: string }) {
  const { data: recurrence, isLoading } = useSaleRecurrence(saleId);
  const { createCheckout, isCreating } = useSaleCheckout();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">A carregar recorrência...</span>
      </div>
    );
  }

  if (!recurrence) return null;

  const cycles = recurrence.cycles;
  const paid = cycles.filter((c) => c.status === 'paid');
  const outstanding = cycles.filter((c) => c.status === 'pending' || c.status === 'failed');
  const totalPaid = paid.reduce((sum, c) => sum + Number(c.amount), 0);
  const totalOutstanding = outstanding.reduce((sum, c) => sum + Number(c.amount), 0);

  const handleCheckout = async () => {
    const url = await createCheckout(recurrence.id);
    setCheckoutUrl(url);
    window.open(url, '_blank');
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Recorrência mensal</span>
            </div>
            <p className="text-2xl font-semibold mt-1">
              {formatCurrency(Number(recurrence.amount))}
              <span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={serviceTone(recurrence.service_status)}>
              {SERVICE_LABEL[recurrence.service_status]}
            </Badge>
            <Badge variant="outline" className={billingTone(recurrence.billing_status)}>
              {BILLING_LABEL[recurrence.billing_status]}
            </Badge>
          </div>
        </div>

        {/* Um cliente em atraso continua com o serviço ligado. Dizê-lo em voz
            alta evita a leitura errada de que "ativo" significa "pago". */}
        {recurrence.billing_status === 'past_due' && recurrence.service_status === 'active' && (
          <div className="flex gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Há cobranças em atraso, mas o serviço continua ativo. Suspender o serviço é uma
              decisão sua — não acontece automaticamente por um pagamento falhado.
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Liquidado</p>
            <p className="font-medium text-green-600">{formatCurrency(totalPaid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Por liquidar</p>
            <p className={`font-medium ${totalOutstanding > 0 ? 'text-amber-600' : ''}`}>
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Próximo ciclo</p>
            <p className="font-medium">
              {recurrence.next_cycle_date
                ? new Date(recurrence.next_cycle_date).toLocaleDateString('pt-PT')
                : '—'}
            </p>
          </div>
        </div>

        {recurrence.billing_provider === 'stripe' && !recurrence.stripe_subscription_id && (
          <div className="rounded-md border border-dashed p-3 space-y-2">
            <p className="text-sm font-medium">Subscrição por ativar</p>
            <p className="text-xs text-muted-foreground">
              O cliente ainda não concluiu o pagamento. Envie-lhe o link para a subscrição começar
              a ser cobrada automaticamente.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={handleCheckout} disabled={isCreating} className="gap-2">
                {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CreditCard className="h-3.5 w-3.5" />}
                {checkoutUrl ? 'Gerar novo link' : 'Gerar link de pagamento'}
              </Button>
              {checkoutUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(checkoutUrl);
                    toast.success('Link copiado');
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar link
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Ciclos ({cycles.length})
          </p>
          {cycles.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Ainda não há ciclos. O primeiro é criado na data de renovação.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {cycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <CycleIcon status={cycle.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize truncate">
                        {monthLabel(cycle.period_start)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {CYCLE_LABEL[cycle.status]}
                        {cycle.paid_at &&
                          ` · ${new Date(cycle.paid_at).toLocaleDateString('pt-PT')}`}
                        {cycle.failure_reason && ` · ${cycle.failure_reason}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium shrink-0">
                    {formatCurrency(Number(cycle.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
