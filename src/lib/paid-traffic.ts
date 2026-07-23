/**
 * Single source of truth for traffic-source classification and filtering.
 *
 * Used by PaidTrafficCard, useFilteredLeads, useLeadReporting,
 * TeamPerformanceTable, and the Dashboard traffic-source dropdown.
 */

/** Canonical paid-source labels emitted by detectLeadSource for paid platforms. */
export const PAID_SOURCE_LABELS: readonly string[] = Object.freeze([
  "Facebook Ads",
  "Google Ads",
  "TikTok Ads",
  "Instagram Ads",
  "LinkedIn Ads",
  "YouTube Ads",
  "Twitter/X Ads",
]);

/** Case-insensitive substrings that mark a source as paid traffic. */
const PAID_SUBSTRINGS: readonly string[] = Object.freeze(["ads", "pago", "paid"]);

function normalize(source: string | null | undefined): string {
  if (typeof source !== "string") return "";
  return source.trim().toLowerCase();
}

/**
 * Returns true when `source` represents paid traffic.
 *
 * A source is considered paid when, after trim + lowercase, it is non-empty AND:
 *   1. contains any of the substrings "ads", "pago", or "paid" (case-insensitive), OR
 *   2. exactly (case-insensitive, trimmed) matches a canonical PAID_SOURCE_LABELS entry.
 *
 * Returns false for null/undefined/empty/whitespace.
 */
export function isPaidTraffic(source: string | null | undefined): boolean {
  const lower = normalize(source);
  if (lower === "") return false;
  for (let i = 0; i < PAID_SUBSTRINGS.length; i++) {
    if (lower.includes(PAID_SUBSTRINGS[i] as string)) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Traffic-source filter dropdown
// ---------------------------------------------------------------------------

/**
 * Filter keys for the Dashboard traffic-source dropdown.
 * - "all"       → show every lead regardless of source
 * - "paid-all"  → show only paid-traffic leads (isPaidTraffic === true)
 * - "meta"      → Meta/Facebook Ads only (Facebook, Instagram, Meta)
 * - "google"    → Google Ads only
 * - "tiktok"    → TikTok Ads only
 * - "instagram" → Instagram Ads only
 * - "linkedin"  → LinkedIn Ads only
 */
export type TrafficFilterKey =
  | "all"
  | "paid-all"
  | "meta"
  | "google"
  | "tiktok"
  | "instagram"
  | "linkedin";

export const TRAFFIC_FILTER_OPTIONS: readonly { value: TrafficFilterKey; label: string }[] = Object.freeze([
  { value: "all", label: "Todos" },
  { value: "paid-all", label: "Tráfego Pago — Todos" },
  { value: "meta", label: "Meta Ads" },
  { value: "google", label: "Google Ads" },
  { value: "tiktok", label: "TikTok Ads" },
  { value: "instagram", label: "Instagram Ads" },
  { value: "linkedin", label: "LinkedIn Ads" },
]);

/**
 * Returns a predicate that, given a lead `source` string, decides whether it
 * matches the selected traffic filter.
 *
 * - "all"       → always true
 * - "paid-all"  → isPaidTraffic(source)
 * - "meta"      → source contains "facebook", "meta", "instagram", or "ig"
 *                 (Meta owns Facebook + Instagram; both are Meta Ads)
 * - "google"    → source contains "google"
 * - "tiktok"    → source contains "tiktok"
 * - "instagram" → source contains "instagram" or "ig"
 * - "linkedin"  → source contains "linkedin"
 */
export function getTrafficMatcher(key: TrafficFilterKey): (source: string | null | undefined) => boolean {
  switch (key) {
    case "all":
      return () => true;
    case "paid-all":
      return isPaidTraffic;
    case "meta":
      return (source) => {
        const s = normalize(source);
        if (s === "") return false;
        return s.includes("facebook") || s.includes("meta") || s.includes("instagram") || s.includes("ig") || s.includes("fb");
      };
    case "google":
      return (source) => {
        const s = normalize(source);
        return s !== "" && s.includes("google");
      };
    case "tiktok":
      return (source) => {
        const s = normalize(source);
        return s !== "" && s.includes("tiktok");
      };
    case "instagram":
      return (source) => {
        const s = normalize(source);
        if (s === "") return false;
        return s.includes("instagram") || s.includes("ig");
      };
    case "linkedin":
      return (source) => {
        const s = normalize(source);
        return s !== "" && s.includes("linkedin");
      };
    default:
      return () => true;
  }
}

/**
 * Returns true when the filter key represents a paid-traffic filter
 * (i.e. not "all"). Useful for components that need to know whether
 * to apply PostgREST-level paid filtering in addition to the in-memory matcher.
 */
export function isPaidFilter(key: TrafficFilterKey): boolean {
  return key !== "all";
}
