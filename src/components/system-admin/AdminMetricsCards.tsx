import { DollarSign, Users, Clock, AlertTriangle } from "lucide-react";
import { MetricCard } from "@/components/dashboard/MetricCard";

const PLAN_PRICES: Record<string, number> = { starter: 49, pro: 99, elite: 147 };

interface Organization {
  id: string;
  plan: string | null;
  trial_ends_at: string | null;
  billing_exempt: boolean | null;
}

interface AdminMetricsCardsProps {
  organizations: Organization[];
}

export function AdminMetricsCards({ organizations }: AdminMetricsCardsProps) {
  const now = new Date();

  const isInTrial = (o: Organization) =>
    !o.billing_exempt && o.trial_ends_at && new Date(o.trial_ends_at) > now;

  const mrr = organizations.reduce((sum, org) => {
    if (org.billing_exempt || isInTrial(org)) return sum;
    return sum + (PLAN_PRICES[org.plan || ""] || 0);
  }, 0);

  const paying = organizations.filter(
    (o) => !o.billing_exempt && !isInTrial(o) && o.plan && o.plan !== "basic"
  ).length;

  const inTrial = organizations.filter((o) => isInTrial(o)).length;

  const expired = organizations.filter(
    (o) =>
      !o.billing_exempt &&
      !isInTrial(o) &&
      (!o.plan || o.plan === "basic")
  ).length;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="MRR"
        value={`€${mrr}`}
        subtitle="Receita mensal recorrente"
        icon={<DollarSign className="h-5 w-5 text-primary" />}
      />
      <MetricCard
        title="Clientes Pagantes"
        value={paying}
        subtitle="Com plano ativo"
        icon={<Users className="h-5 w-5 text-primary" />}
      />
      <MetricCard
        title="Em Trial"
        value={inTrial}
        subtitle="Trial ativo"
        icon={<Clock className="h-5 w-5 text-primary" />}
      />
      <MetricCard
        title="Trials Expirados"
        value={expired}
        subtitle="Sem plano pago"
        icon={<AlertTriangle className="h-5 w-5 text-primary" />}
      />
    </div>
  );
}
