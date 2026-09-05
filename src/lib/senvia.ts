/**
 * The Senvia organization itself, the one that operates the product rather than
 * buying it.
 *
 * The same id is already hardcoded in five edge functions
 * (stripe-webhook, check-trial-status, reconcile-stripe-payments,
 * stripe-health, notify-new-trials) as SENVIA_AGENCY_ORG_ID. This is the
 * frontend's copy of that constant.
 */
export const SENVIA_ORG_ID = "06fe9e1d-9670-45b0-8717-c5a6e90be380";

export function isSenviaOrg(organizationId?: string | null): boolean {
  return organizationId === SENVIA_ORG_ID;
}
