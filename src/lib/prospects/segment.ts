import type { Prospect } from "@/types/prospects";

const normalizeMetadataText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized || null;
};

export const getProspectSegment = (
  prospect: Pick<Prospect, "segment" | "metadata">
): string | null => {
  return prospect.segment?.trim() || normalizeMetadataText(prospect.metadata?.com);
};
