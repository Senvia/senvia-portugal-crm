import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID = "2Mdma1N6Fd0y3QEjR";
const MAX_POLL_MS = 5 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;

interface ApifyItem {
  title?: string;
  phone?: string;
  website?: string;
  address?: string;
  categoryName?: string;
  totalScore?: number;
  url?: string;
  city?: string;
  postalCode?: string;
  reviewsCount?: number;
  [key: string]: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const APIFY_API_TOKEN = Deno.env.get("APIFY_API_TOKEN");
    if (!APIFY_API_TOKEN) {
      return new Response(JSON.stringify({ error: "APIFY_API_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      organizationId,
      searchStrings = [],
      location = "",
      maxResults = 50,
      language = "pt",
      skipClosed = true,
    } = body;

    if (!organizationId) {
      return new Response(JSON.stringify({ error: "organizationId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!searchStrings.length || !location) {
      return new Response(JSON.stringify({ error: "searchStrings and location are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Start Apify actor run
    const actorInput = {
      searchStringsArray: searchStrings,
      locationQuery: location,
      maxCrawledPlacesPerSearch: maxResults,
      language,
      searchMatching: "all",
      placeMinimumStars: "",
      website: "allPlaces",
      skipClosedPlaces: skipClosed,
      scrapePlaceDetailPage: false,
      scrapeTableReservationProvider: false,
      includeWebResults: false,
      scrapeDirectories: false,
      maxQuestions: 0,
      scrapeContacts: false,
      scrapeSocialMediaProfiles: {
        facebooks: false,
        instagrams: false,
        youtubes: false,
        tiktoks: false,
        twitters: false,
      },
      maximumLeadsEnrichmentRecords: 0,
    };

    const runRes = await fetch(`${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_API_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(actorInput),
    });

    if (!runRes.ok) {
      const errText = await runRes.text();
      return new Response(
        JSON.stringify({ error: `Apify start failed [${runRes.status}]: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const runData = await runRes.json();
    const runId = runData?.data?.id;
    if (!runId) {
      return new Response(JSON.stringify({ error: "No run ID returned from Apify" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Poll for completion
    const startTime = Date.now();
    let status = "RUNNING";

    while (status === "RUNNING" || status === "READY") {
      if (Date.now() - startTime > MAX_POLL_MS) {
        return new Response(
          JSON.stringify({ error: "Apify run timed out after 5 minutes" }),
          { status: 504, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const statusRes = await fetch(
        `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_API_TOKEN}`
      );
      const statusData = await statusRes.json();
      status = statusData?.data?.status || "FAILED";
    }

    if (status !== "SUCCEEDED") {
      return new Response(
        JSON.stringify({ error: `Apify run ended with status: ${status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch dataset items
    const datasetRes = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${APIFY_API_TOKEN}&format=json`
    );
    const items: ApifyItem[] = await datasetRes.json();

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({ inserted: 0, updated: 0, skipped: 0, total: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for inserts
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get existing prospects for dedup
    const { data: existing } = await serviceSupabase
      .from("prospects")
      .select("id, company_name, phone")
      .eq("organization_id", organizationId);

    const existingMap = new Map<string, string>();
    for (const row of existing || []) {
      const key = `${(row.company_name || "").toLowerCase().trim()}::${(row.phone || "").trim()}`;
      existingMap.set(key, row.id);
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const item of items) {
      const companyName = (item.title || "").trim();
      if (!companyName) {
        skipped++;
        continue;
      }

      const phone = (item.phone || "").trim();
      const dedupKey = `${companyName.toLowerCase()}::${phone}`;

      const email = item.website && item.website.includes("@") ? item.website : null;
      const metadata: Record<string, unknown> = {
        address: item.address || null,
        city: item.city || null,
        postal_code: item.postalCode || null,
        rating: item.totalScore || null,
        reviews_count: item.reviewsCount || null,
        google_maps_url: item.url || null,
        website: item.website && !item.website.includes("@") ? item.website : null,
        source_search: searchStrings.join(", "),
        source_location: location,
      };

      const payload = {
        organization_id: organizationId,
        company_name: companyName,
        phone: phone || null,
        email,
        segment: item.categoryName || null,
        source: "apify_google_maps",
        source_file_name: `Google Maps: ${searchStrings.join(", ")} - ${location}`,
        imported_by: userData.user.id,
        imported_at: new Date().toISOString(),
        metadata,
        status: "new",
      };

      const existingId = existingMap.get(dedupKey);

      if (existingId) {
        const { error } = await serviceSupabase
          .from("prospects")
          .update(payload)
          .eq("id", existingId);
        if (!error) updated++;
        else skipped++;
      } else {
        const { error } = await serviceSupabase.from("prospects").insert(payload);
        if (!error) {
          inserted++;
          existingMap.set(dedupKey, "new");
        } else skipped++;
      }
    }

    return new Response(
      JSON.stringify({ inserted, updated, skipped, total: items.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-prospects error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
