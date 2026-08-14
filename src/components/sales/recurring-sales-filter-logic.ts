import type { BillingProvider, BillingStatus, ServiceStatus } from "../../types/recurring-sales";

export const RECURRING_FILTER_ALL = "all" as const;

export type RecurringFilterValue<TValue extends string> = TValue | typeof RECURRING_FILTER_ALL;

export type RecurringSalesFilters = Readonly<{
  serviceStatus: RecurringFilterValue<ServiceStatus>;
  billingStatus: RecurringFilterValue<BillingStatus>;
  billingProvider: RecurringFilterValue<BillingProvider>;
  productId: string | typeof RECURRING_FILTER_ALL;
}>;

export type RecurrenceFilterState = Readonly<{
  serviceStatus: ServiceStatus;
  billingStatus: BillingStatus;
  billingProvider: BillingProvider;
}>;

export type RecurringSaleFilterCandidate = Readonly<{
  hasRecurring: boolean;
  recurrence: RecurrenceFilterState | null;
  recurringProductIds: readonly string[];
}>;

export type RecurringSalesQuery = Readonly<{
  organizationId: string;
  serviceStatus?: ServiceStatus;
  billingStatus?: BillingStatus;
  billingProvider?: BillingProvider;
  productId?: string;
}>;

export const DEFAULT_RECURRING_SALES_FILTERS: RecurringSalesFilters = {
  serviceStatus: RECURRING_FILTER_ALL,
  billingStatus: RECURRING_FILTER_ALL,
  billingProvider: RECURRING_FILTER_ALL,
  productId: RECURRING_FILTER_ALL,
};

const SERVICE_STATUS_FILTER_VALUES = [RECURRING_FILTER_ALL, "pending", "active", "paused", "inactive", "cancelled"] as const;
const BILLING_STATUS_FILTER_VALUES = [RECURRING_FILTER_ALL, "not_started", "current", "past_due", "uncollectible"] as const;
const BILLING_PROVIDER_FILTER_VALUES = [RECURRING_FILTER_ALL, "manual", "stripe"] as const;

export function parseServiceStatusFilter(value: string): RecurringSalesFilters["serviceStatus"] {
  return SERVICE_STATUS_FILTER_VALUES.find((status) => status === value) ?? RECURRING_FILTER_ALL;
}

export function parseBillingStatusFilter(value: string): RecurringSalesFilters["billingStatus"] {
  return BILLING_STATUS_FILTER_VALUES.find((status) => status === value) ?? RECURRING_FILTER_ALL;
}

export function parseBillingProviderFilter(value: string): RecurringSalesFilters["billingProvider"] {
  return BILLING_PROVIDER_FILTER_VALUES.find((provider) => provider === value) ?? RECURRING_FILTER_ALL;
}

export function hasRecurringSalesFilter(filters: RecurringSalesFilters): boolean {
  return (
    filters.serviceStatus !== RECURRING_FILTER_ALL ||
    filters.billingStatus !== RECURRING_FILTER_ALL ||
    filters.billingProvider !== RECURRING_FILTER_ALL ||
    filters.productId !== RECURRING_FILTER_ALL
  );
}

export function matchesRecurringSalesFilters(
  sale: RecurringSaleFilterCandidate,
  filters: RecurringSalesFilters,
): boolean {
  if (!hasRecurringSalesFilter(filters)) return true;
  if (!sale.hasRecurring || sale.recurrence === null) return false;

  const matchesService =
    filters.serviceStatus === RECURRING_FILTER_ALL ||
    sale.recurrence.serviceStatus === filters.serviceStatus;
  const matchesBilling =
    filters.billingStatus === RECURRING_FILTER_ALL ||
    sale.recurrence.billingStatus === filters.billingStatus;
  const matchesProvider =
    filters.billingProvider === RECURRING_FILTER_ALL ||
    sale.recurrence.billingProvider === filters.billingProvider;
  const matchesProduct =
    filters.productId === RECURRING_FILTER_ALL ||
    sale.recurringProductIds.includes(filters.productId);

  return matchesService && matchesBilling && matchesProvider && matchesProduct;
}

export const matchesRecurringSaleFilters = matchesRecurringSalesFilters;

export function buildRecurringSalesQuery(
  organizationId: string,
  filters: RecurringSalesFilters,
): RecurringSalesQuery {
  return {
    organizationId,
    ...(filters.serviceStatus !== RECURRING_FILTER_ALL
      ? { serviceStatus: filters.serviceStatus }
      : {}),
    ...(filters.billingStatus !== RECURRING_FILTER_ALL
      ? { billingStatus: filters.billingStatus }
      : {}),
    ...(filters.billingProvider !== RECURRING_FILTER_ALL
      ? { billingProvider: filters.billingProvider }
      : {}),
    ...(filters.productId !== RECURRING_FILTER_ALL ? { productId: filters.productId } : {}),
  };
}

export function buildActivePaidTrafficSalesQuery(
  organizationId: string,
  productId: string,
): RecurringSalesQuery {
  return {
    organizationId,
    serviceStatus: "active",
    productId,
  };
}

export function isActivePaidTrafficSale(
  sale: RecurringSaleFilterCandidate,
  productId: string,
): boolean {
  return matchesRecurringSalesFilters(sale, {
    ...DEFAULT_RECURRING_SALES_FILTERS,
    serviceStatus: "active",
    productId,
  });
}
