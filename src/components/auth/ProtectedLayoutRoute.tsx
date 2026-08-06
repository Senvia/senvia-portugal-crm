import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { OrganizationSelector } from './OrganizationSelector';
import { CompleteOrganizationSetup } from './CompleteOrganizationSetup';
import { ChallengeMFA } from './ChallengeMFA';
import { TrialExpiredBlocker } from './TrialExpiredBlocker';
import { PaymentOverdueBlocker } from './PaymentOverdueBlocker';
import { useStripeSubscription } from '@/hooks/useStripeSubscription';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { usePermissions } from '@/hooks/usePermissions';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { AppLayout } from '@/components/layout/AppLayout';
import { WhatsNewDialog } from '@/components/announcements/WhatsNewDialog';

export function ProtectedLayoutRoute() {
  const { user, isLoading, needsOrgSelection, organizations, selectOrganization, mfaStatus, completeMfaChallenge, organization, profile } = useAuth();
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

  if (mfaStatus === 'pending') {
    return <ChallengeMFA onSuccess={completeMfaChallenge} />;
  }

  if (needsOrgSelection && organizations.length > 1) {
    return (
      <OrganizationSelector
        organizations={organizations}
        onSelect={selectOrganization}
      />
    );
  }

  // Authenticated but belongs to no organization — signup created the account
  // and stopped before creating the company (the email-confirmation branch does
  // exactly that). Without this the user got a fully rendered but empty CRM and
  // no way to fix it. Ask for (or silently resume) the company setup instead.
  if (organizations.length === 0) {
    return <CompleteOrganizationSetup />;
  }

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

  // PAYING CUSTOMER past the grace window → "renew your plan" blocker (NOT the
  // trial blocker). Mirrors ProtectedRoute: this is the app's main layout route,
  // so without this branch a paying-overdue customer would never be blocked.
  // Only plan_expired blocks; payment_overdue (still in grace) shows the banner.
  if (
    hasCheckedSub &&
    subscriptionStatus &&
    !subscriptionStatus.billing_exempt &&
    subscriptionStatus.first_paid_at &&
    subscriptionStatus.plan_expired === true &&
    !location.pathname.startsWith('/settings')
  ) {
    return (
      <PaymentOverdueBlocker
        paymentFailedAt={subscriptionStatus.current_period_end ?? subscriptionStatus.payment_failed_at ?? undefined}
      />
    );
  }

  // TRIAL customer with the trial over (and never paid). Belt-and-suspenders:
  // also read organization.first_paid_at from AuthContext so a payer never sees
  // the trial blocker even if the edge function response lags or errors.
  const orgFirstPaidAt = (organization as { first_paid_at?: string | null } | null)?.first_paid_at;
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

  return (
    <AppLayout userName={profile?.full_name} organizationName={organization?.name}>
      <Outlet />
      <WhatsNewDialog organizationId={organization?.id} />
    </AppLayout>
  );
}
