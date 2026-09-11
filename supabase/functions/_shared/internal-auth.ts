import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

export async function internalJobGuard(req: Request): Promise<Response | null> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const bearer = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  const provided = req.headers.get("x-automation-secret") || bearer;
  if (!provided || provided.length > 4096) return new Response("Unauthorized", { status: 401 });
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!key || !url) return new Response("Service unavailable", { status: 503 });
  if (bearer === key) return null;
  try {
    const client = createClient(url, key);
    const { data, error } = await client.rpc("verify_automation_secret", { p_secret: provided });
    if (!error && data === true) return null;
  } catch (error) {
    console.error("internal_auth_unavailable", { kind: error instanceof Error ? error.name : "unknown" });
  }
  return new Response("Unauthorized", { status: 401 });
}
