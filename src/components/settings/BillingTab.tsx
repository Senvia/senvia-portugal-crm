import { useEffect, useState } from 'react';
import { Check, Crown, Loader2, ExternalLink, Sparkles, Users, FileText, MessageSquare, BarChart3, Puzzle, Zap, Package, CreditCard, Clock, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useStripeSubscription } from '@/hooks/useStripeSubscription';
import { STRIPE_PLANS, type StripePlan, type BillingPeriod } from '@/lib/stripe-plans';
import { PricingPlans, PricingCtaButton } from '@/components/billing/PricingPlans';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

const INTEGRATION_ICONS: Record<string, React.ElementType> = {
  WhatsApp: MessageSquare,
  'Meta Pixels': BarChart3,
  'Faturação (KeyInvoice, InvoiceXpress)': FileText,
  'Pagamentos (Stripe)': CreditCard,
};

export function BillingTab() {
  const { organization } = useAuth();
  const { isLoading, subscriptionStatus, hasChecked, checkSubscription, createCheckout, openCustomerPortal } = useStripeSubscription();
  const [checkingPlan, setCheckingPlan] = useState<string | null>(null);
  const [period, setPeriod] = useState<BillingPeriod>('monthly');

  const isOnTrial = subscriptionStatus?.on_trial === true;
  const hasActiveSubscription = subscriptionStatus?.subscribed === true;
  // Only use plan_id as "current" if user has an active paid subscription (not trial)
  const currentPlanId = hasActiveSubscription ? (subscriptionStatus?.plan_id || 'starter') : null;
  const currentIndex = currentPlanId ? STRIPE_PLANS.findIndex(p => p.id === currentPlanId) : -1;
  const hasNoSubscription = !hasChecked || !hasActiveSubscription;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success') {
      // Fire Meta Pixel Purchase event
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Purchase', {
          content_name: 'Senvia OS Subscription',
          content_category: 'subscription',
          currency: 'EUR',
          value: 0,
        });
      }
      setTimeout(() => checkSubscription(), 2000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [checkSubscription]);

  const handleSelectPlan = async (plan: StripePlan) => {
    if (plan.id === currentPlanId) return;
    // Use the price id for the chosen period; annual ids may not be set up in
    // Stripe yet, in which case we don't start a (wrong) checkout.
    const priceId = period === 'yearly' ? plan.priceIdYearly : plan.priceId;
    if (!priceId) return;
    setCheckingPlan(plan.id);
    await createCheckout(priceId);
    setCheckingPlan(null);
  };

  return (
    <div className="space-y-6">
      {/* Billing Exempt Status */}
      {subscriptionStatus?.billing_exempt && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Crown className="h-4 w-4 text-emerald-500" />
            <span className="font-semibold text-sm">Plano Vitalício</span>
            <Badge className="bg-emerald-500 text-white text-[10px] px-2.5 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              Isento
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            A sua organização tem acesso vitalício ao plano Elite sem necessidade de pagamento.
          </p>
        </div>
      )}

      {/* Trial Status */}
      {isOnTrial && subscriptionStatus?.days_remaining !== undefined && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-sm">Período de Teste</span>
            <Badge className="bg-amber-500 text-white text-[10px] px-2.5 py-1">
              {subscriptionStatus.days_remaining} {subscriptionStatus.days_remaining === 1 ? 'dia restante' : 'dias restantes'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Tem acesso total a todos os módulos. Escolha um plano antes do fim do período de teste.
          </p>
        </div>
      )}

      {/* Current Plan Status - only when subscribed */}
      {!subscriptionStatus?.billing_exempt && subscriptionStatus?.subscribed && subscriptionStatus.subscription_end && (
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

      {/* Plans — reference visual (brush, heading, animated switch, gradient
          CTAs), shared with the public /precos page. */}
      <PricingPlans
        period={period}
        onPeriodChange={setPeriod}
        currentPlanId={currentPlanId}
        renderCta={(plan, { isCurrent, popular }) => {
          if (subscriptionStatus?.billing_exempt) {
            return (
              <PricingCtaButton popular={popular} disabled>
                Incluído no vitalício
              </PricingCtaButton>
            );
          }
          const planIndex = STRIPE_PLANS.findIndex((p) => p.id === plan.id);
          const isUpgrade = !hasNoSubscription && planIndex > currentIndex;
          const isDowngrade = !hasNoSubscription && planIndex < currentIndex;
          // Annual price ids aren't configured in Stripe yet: block annual checkout
          // for select/upgrade (downgrade goes through the customer portal).
          const blockAnnual = period === 'yearly' && !plan.priceIdYearly && !isDowngrade && !isCurrent;
          const busy = checkingPlan === plan.id;
          return (
            <PricingCtaButton
              popular={popular}
              disabled={isCurrent || isLoading || busy || blockAnnual}
              onClick={() => (isDowngrade ? openCustomerPortal() : handleSelectPlan(plan))}
            >
              {busy ? (
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              ) : isCurrent ? (
                'Plano Atual'
              ) : blockAnnual ? (
                'Anual em breve'
              ) : hasNoSubscription ? (
                'Selecionar'
              ) : isUpgrade ? (
                'Fazer Upgrade'
              ) : (
                'Fazer Downgrade'
              )}
            </PricingCtaButton>
          );
        }}
      />
    </div>
  );
}
