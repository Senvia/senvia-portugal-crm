import { useEffect, useState } from 'react';
import { Check, Crown, Loader2, ExternalLink, Sparkles, Users, FileText, MessageSquare, BarChart3, Puzzle, Zap, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useStripeSubscription } from '@/hooks/useStripeSubscription';
import { STRIPE_PLANS, type StripePlan } from '@/lib/stripe-plans';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const INTEGRATION_ICONS: Record<string, React.ElementType> = {
  WhatsApp: MessageSquare,
  'Meta Pixels': BarChart3,
  'Faturação (InvoiceXpress)': FileText,
};

export function BillingTab() {
  const { organization } = useAuth();
  const { isLoading, subscriptionStatus, checkSubscription, createCheckout, openCustomerPortal } = useStripeSubscription();
  const [checkingPlan, setCheckingPlan] = useState<string | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  const currentPlanId = subscriptionStatus?.plan_id || organization?.plan || 'starter';

  useEffect(() => {
    if (!hasChecked) {
      checkSubscription().then(() => setHasChecked(true));
    }
  }, [checkSubscription, hasChecked]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success') {
      setTimeout(() => checkSubscription(), 2000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkSubscription]);

  const handleSelectPlan = async (plan: StripePlan) => {
    if (plan.id === currentPlanId) return;
    setCheckingPlan(plan.id);
    await createCheckout(plan.priceId);
    setCheckingPlan(null);
  };

  return (
    <div className="space-y-6">
      {/* Current Plan Status */}
      {subscriptionStatus?.subscribed && subscriptionStatus.subscription_end && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Subscrição Ativa</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Próxima renovação: {format(new Date(subscriptionStatus.subscription_end), "d 'de' MMMM 'de' yyyy", { locale: pt })}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 gap-2"
            onClick={openCustomerPortal}
            disabled={isLoading}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Gerir Subscrição
          </Button>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
        {STRIPE_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isHighlighted = plan.highlighted;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all ${
                isCurrent
                  ? 'border-primary ring-2 ring-primary/20 shadow-lg'
                  : isHighlighted
                  ? 'border-primary/50 shadow-md'
                  : 'border-border shadow-sm'
              }`}
            >
              {/* Premium Header */}
              <div className={`p-5 md:p-6 ${
                isCurrent
                  ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent'
                  : isHighlighted
                  ? 'bg-gradient-to-br from-primary/8 via-transparent to-transparent'
                  : 'bg-gradient-to-br from-muted/50 to-transparent'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  </div>
                  {isCurrent && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-2.5 py-1 shrink-0">
                      <Crown className="h-3 w-3 mr-1" />
                      Atual
                    </Badge>
                  )}
                  {isHighlighted && !isCurrent && (
                    <Badge variant="secondary" className="text-[10px] px-2.5 py-1 shrink-0">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.priceMonthly}€</span>
                  <span className="text-muted-foreground text-sm font-medium">/mês</span>
                </div>
              </div>

              <Separator />

              {/* Content */}
              <div className="flex-1 p-5 md:p-6 space-y-5">
                {/* Modules */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Módulos Incluídos</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.modules.map((mod, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{mod}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator className="opacity-50" />

                {/* Integrations */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Puzzle className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Integrações</span>
                  </div>
                  {plan.integrations.length > 0 ? (
                    <ul className="space-y-2">
                      {plan.integrations.map((integ, i) => {
                        const Icon = INTEGRATION_ICONS[integ] || Zap;
                        return (
                          <li key={i} className="flex items-center gap-2.5 text-sm">
                            <Icon className="h-4 w-4 text-primary shrink-0" />
                            <span>{integ}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma integração incluída</p>
                  )}
                </div>

                <Separator className="opacity-50" />

                {/* Limits */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limites</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 text-sm">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span><span className="font-medium">{plan.limits.users}</span> utilizadores</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span><span className="font-medium">{plan.limits.forms}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-5 md:p-6 pt-0">
                <Button
                  className="w-full"
                  size="lg"
                  variant={isCurrent ? 'outline' : isHighlighted ? 'default' : 'secondary'}
                  disabled={isCurrent || isLoading || checkingPlan === plan.id}
                  onClick={() => handleSelectPlan(plan)}
                >
                  {checkingPlan === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    'Plano Atual'
                  ) : (
                    'Fazer Upgrade'
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
