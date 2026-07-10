/**
 * Single source of truth for "paid traffic" classification.
 *
 * Mirrors the PostgREST filter that already existed in PaidTrafficCard
 * (ilike.%ads%, %pago%, %paid%) and adds the canonical paid-source
 * labels that detectLeadSource can emit when a click id (fbclid/gclid/ttclid)
 * indicates paid traffic.
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
