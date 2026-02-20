import { useEffect, useState } from 'react';
import { Check, Crown, Loader2, ExternalLink, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useStripeSubscription } from '@/hooks/useStripeSubscription';
import { STRIPE_PLANS, type StripePlan } from '@/lib/stripe-plans';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

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

  // Check for success/cancel query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success') {
      // Refresh subscription status after successful checkout
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
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Subscrição Ativa</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STRIPE_PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isHighlighted = plan.highlighted;

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-5 transition-all ${
                isCurrent
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                  : isHighlighted
                  ? 'border-primary/40 bg-card'
                  : 'border-border bg-card'
              }`}
            >
              {isCurrent && (
                <Badge className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                  Plano Atual
                </Badge>
              )}
              {isHighlighted && !isCurrent && (
                <Badge variant="secondary" className="absolute -top-2.5 left-4 text-[10px] px-2 py-0.5">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Popular
                </Badge>
              )}

              <div className="mb-4">
                <h3 className="font-semibold text-lg">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-bold">{plan.priceMonthly}€</span>
                  <span className="text-muted-foreground text-sm">/mês</span>
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
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
          );
        })}
      </div>
    </div>
  );
}
