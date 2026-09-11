import { z } from "https://esm.sh/zod@3.25.76";

export const ottoInput = z.object({
  organization_id: z.string().uuid(),
  attachment_paths: z.array(z.string().min(1).max(512)).max(5).optional(),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000),
  }).strict()).min(1).max(40),
}).strict();

export const prospectInput = z.object({
  organizationId: z.string().uuid(),
  searchStrings: z.array(z.string().trim().min(1).max(150)).max(3).default([]),
  location: z.string().max(200).default(""),
  maxResults: z.number().int().min(1).max(50).default(50),
  language: z.string().max(10).default("pt-PT"),
  skipClosed: z.boolean().default(true),
  searchMatching: z.enum(["all", "exact"]).default("all"),
  placeMinimumStars: z.enum(["", "none", "1", "2", "3", "4", "5"]).default(""),
  website: z.enum(["allPlaces", "withWebsite", "withoutWebsite"]).default("allPlaces"),
  scrapePlaceDetailPage: z.boolean().default(false),
  scrapeTableReservationProvider: z.boolean().default(false),
  includeWebResults: z.boolean().default(false),
  scrapeDirectories: z.boolean().default(false),
  maxQuestions: z.number().int().min(0).max(10).default(0),
  scrapeContacts: z.boolean().default(false),
  scrapeSocialMediaProfiles: z.object({
    facebooks: z.boolean(), instagrams: z.boolean(), youtubes: z.boolean(),
    tiktoks: z.boolean(), twitters: z.boolean(),
  }).strict().default({ facebooks: false, instagrams: false, youtubes: false, tiktoks: false, twitters: false }),
  maximumLeadsEnrichmentRecords: z.number().int().min(0).max(50).default(0),
  startUrls: z.array(z.string().url().max(2048).refine(value => {
    const url = new URL(value);
    return url.protocol === "https:" && ["www.google.com", "maps.google.com"].includes(url.hostname)
      && !url.username && !url.password && !url.port;
  })).max(3).default([]),
}).strict();

export async function boundedJson(req: Request, maxBytes = 65536): Promise<unknown> {
  const reader = req.body?.getReader();
  if (!reader) return null;
  let size = 0;
  let text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); return null; }
      text += decoder.decode(value, { stream: true });
    }
    return JSON.parse(text + decoder.decode());
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) return null;
    throw error;
  } finally { reader.releaseLock(); }
}
