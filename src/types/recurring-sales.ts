import type { Tables } from "@/integrations/supabase/types"

export type ServiceStatus =
  | "pending"
  | "active"
  | "paused"
  | "inactive"
  | "cancelled"

export type BillingStatus =
  | "not_started"
  | "current"
  | "past_due"
  | "uncollectible"

export type CycleStatus = "pending" | "paid" | "failed" | "void"

export type BillingProvider = "manual" | "stripe"

export type SaleRecurrence = Readonly<Tables<"sale_recurrences">>

export type RecurringCycle = Readonly<Tables<"sale_recurring_cycles">>

export type StripeConnection = Readonly<Tables<"stripe_connections">>
