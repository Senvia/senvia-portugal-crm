import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { OrganizationSelector } from './OrganizationSelector';
import { ChallengeMFA } from './ChallengeMFA';
import { TrialExpiredBlocker } from './TrialExpiredBlocker';
import { PaymentOverdueBlocker } from './PaymentOverdueBlocker';
import { useStripeSubscription } from '@/hooks/useStripeSubscription';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { usePermissions } from '@/hooks/usePermissions';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, needsOrgSelection, organizations, selectOrganization, mfaStatus, completeMfaChallenge, organization } = useAuth();
  const location = useLocation();
  const { subscriptionStatus, hasChecked: hasCheckedSub } = useStripeSubscription();
  const { data: pipelineStages, isLoading: stagesLoading } = usePipelineStages();
  const { isAdmin } = usePermissions();
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // MFA challenge required
  if (mfaStatus === 'pending') {
    return <ChallengeMFA onSuccess={completeMfaChallenge} />;
  }

  // Show organization selector if user needs to choose
  if (needsOrgSelection && organizations.length > 1) {
    return (
      <OrganizationSelector 
        organizations={organizations}
        onSelect={selectOrganization}
      />
    );
  }

  // Onboarding wizard: show if admin, org exists, no pipeline stages, not already completed
  if (
    !onboardingComplete &&
    !stagesLoading &&
    organization?.id &&
    isAdmin &&
    pipelineStages &&
    pipelineStages.length === 0
  ) {
    return <OnboardingWizard onComplete={() => setOnboardingComplete(true)} />;
  }

  // PAYING CUSTOMER overdue past the grace window — show the "renew your plan"
  // blocker (NOT the trial blocker). This branch is keyed off first_paid_at:
  // once an org has paid even once, it is a paying customer forever and never
  // sees the trial blocker again, regardless of trial_ends_at value.
  // Only `plan_expired` blocks: while still inside the grace window
  // (payment_overdue) the user keeps access and sees the warning banner instead.
  // first_paid_at falls back to the organizations row (AuthContext) so a payer
  // whose stamp is missing from the edge function response still gets blocked
  // when plan_expired — without the fallback they'd never see any blocker.
  const orgFirstPaidAt = (organization as { first_paid_at?: string | null } | null)?.first_paid_at;
  if (
    hasCheckedSub &&
    subscriptionStatus &&
    !subscriptionStatus.billing_exempt &&
    (subscriptionStatus.first_paid_at || orgFirstPaidAt) &&
    subscriptionStatus.plan_expired === true &&
    !location.pathname.startsWith('/settings')
  ) {
    return (
      <PaymentOverdueBlocker
        paymentFailedAt={subscriptionStatus.current_period_end ?? subscriptionStatus.payment_failed_at}
      />
    );
  }

  // TRIAL customer with the trial period over (and never paid).
  //
  // Belt-and-suspenders: we ALSO read organization.first_paid_at directly from
  // AuthContext (which selects * from organizations). If that's set, the org
  // has paid at least once and must NEVER see the trial blocker, regardless
  // of what the edge function response says. This protects against:
  //   * Edge function deploy lag (old code without the first_paid_at logic)
  //   * Edge function errors (returns null subscriptionStatus that defaults
  //     to "trial" semantics elsewhere)
  //   * Stripe API failures during sub lookup
  if (
    hasCheckedSub &&
    subscriptionStatus &&
    !subscriptionStatus.subscribed &&
    !subscriptionStatus.billing_exempt &&
    !subscriptionStatus.first_paid_at &&
    !orgFirstPaidAt &&
    subscriptionStatus.trial_expired === true &&
    !location.pathname.startsWith('/settings')
  ) {
    return <TrialExpiredBlocker trialEndsAt={subscriptionStatus.trial_ends_at} />;
  }

  return <>{children}</>;
}
