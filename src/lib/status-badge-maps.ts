// Maps each domain's status enum to a StatusBadge variant (which carries the
// pill colour + icon) plus the existing Portuguese label. Centralised so the
// look stays consistent across Sales, Proposals, Leads and E-commerce.
import type { StatusVariant } from "@/components/ui/status-badge";
import {
  SALE_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_RECORD_STATUS_LABELS,
  type SaleStatus, type PaymentStatus as SalePaymentStatus, type PaymentRecordStatus,
} from "@/types/sales";
import { PROPOSAL_STATUS_LABELS, type ProposalStatus } from "@/types/proposals";
import { STATUS_LABELS as LEAD_STATUS_LABELS, type LeadStatus } from "@/types";
import {
  ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS as ECOM_PAYMENT_STATUS_LABELS, FULFILLMENT_STATUS_LABELS,
  type OrderStatus, type PaymentStatus as EcomPaymentStatus, type FulfillmentStatus,
} from "@/types/ecommerce";

export interface BadgeSpec { variant: StatusVariant; label: string; }

// ---- Sales ----
const SALE_VARIANT: Record<SaleStatus, StatusVariant> = {
  in_progress: "in_progress",
  fulfilled: "submitted",
  delivered: "success",
  cancelled: "failed",
};
export const saleStatusBadge = (s: SaleStatus): BadgeSpec => ({ variant: SALE_VARIANT[s] ?? "neutral", label: SALE_STATUS_LABELS[s] ?? s });

const SALE_PAYMENT_VARIANT: Record<SalePaymentStatus, StatusVariant> = {
  pending: "pending",
  partial: "in_progress",
  paid: "success",
};
export const salePaymentStatusBadge = (s: SalePaymentStatus): BadgeSpec => ({ variant: SALE_PAYMENT_VARIANT[s] ?? "neutral", label: PAYMENT_STATUS_LABELS[s] ?? s });

const PAYMENT_RECORD_VARIANT: Record<PaymentRecordStatus, StatusVariant> = {
  pending: "pending",
  paid: "success",
};
export const paymentRecordStatusBadge = (s: PaymentRecordStatus): BadgeSpec => ({ variant: PAYMENT_RECORD_VARIANT[s] ?? "neutral", label: PAYMENT_RECORD_STATUS_LABELS[s] ?? s });

// ---- Proposals ----
const PROPOSAL_VARIANT: Record<ProposalStatus, StatusVariant> = {
  draft: "neutral",
  sent: "in_progress",
  negotiating: "pending",
  accepted: "success",
  rejected: "failed",
  expired: "expired",
};
export const proposalStatusBadge = (s: ProposalStatus): BadgeSpec => ({ variant: PROPOSAL_VARIANT[s] ?? "neutral", label: PROPOSAL_STATUS_LABELS[s] ?? s });

// ---- Leads ----
const LEAD_VARIANT: Record<LeadStatus, StatusVariant> = {
  new: "in_progress",
  contacted: "submitted",
  scheduled: "pending",
  proposal: "in_review",
  won: "success",
  lost: "failed",
};
export const leadStatusBadge = (s: LeadStatus): BadgeSpec => ({ variant: LEAD_VARIANT[s] ?? "neutral", label: LEAD_STATUS_LABELS[s] ?? s });

// ---- E-commerce ----
const ORDER_VARIANT: Record<OrderStatus, StatusVariant> = {
  pending: "pending",
  confirmed: "in_progress",
  processing: "in_review",
  shipped: "submitted",
  delivered: "success",
  cancelled: "failed",
};
export const orderStatusBadge = (s: OrderStatus): BadgeSpec => ({ variant: ORDER_VARIANT[s] ?? "neutral", label: ORDER_STATUS_LABELS[s] ?? s });

const ECOM_PAYMENT_VARIANT: Record<EcomPaymentStatus, StatusVariant> = {
  pending: "pending",
  paid: "success",
  refunded: "in_progress",
  failed: "failed",
};
export const ecomPaymentStatusBadge = (s: EcomPaymentStatus): BadgeSpec => ({ variant: ECOM_PAYMENT_VARIANT[s] ?? "neutral", label: ECOM_PAYMENT_STATUS_LABELS[s] ?? s });

const FULFILLMENT_VARIANT: Record<FulfillmentStatus, StatusVariant> = {
  unfulfilled: "expired",
  partial: "pending",
  fulfilled: "success",
};
export const fulfillmentStatusBadge = (s: FulfillmentStatus): BadgeSpec => ({ variant: FULFILLMENT_VARIANT[s] ?? "neutral", label: FULFILLMENT_STATUS_LABELS[s] ?? s });
