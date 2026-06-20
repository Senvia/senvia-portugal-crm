// AI provider client. Model + endpoint are configurable via env vars so the
// deploy can switch models without code changes. Defaults reproduce the legacy
// otto-chat behaviour exactly (Gemini 2.5 Flash via the OpenAI-compat gateway),
// so no new secrets are required for backward compatibility.
//
//   OTTO_MODEL     — model id            (default: "gemini-2.5-flash")
//   OTTO_API_BASE  — chat completions URL (default: Gemini OpenAI-compat endpoint)
//   OTTO_API_KEY   — provider key         (default: falls back to GEMINI_API_KEY)
const DEFAULT_BASE =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const DEFAULT_MODEL = "gemini-2.5-flash";

export interface AIConfig {
  model: string;
  baseUrl: string;
  apiKey: string;
}

export function getAIConfig(): AIConfig {
  const apiKey = Deno.env.get("OTTO_API_KEY") || Deno.env.get("GEMINI_API_KEY") || "";
  if (!apiKey) throw new Error("Nenhuma chave de IA configurada (OTTO_API_KEY ou GEMINI_API_KEY).");
  return {
    model: Deno.env.get("OTTO_MODEL") || DEFAULT_MODEL,
    baseUrl: Deno.env.get("OTTO_API_BASE") || DEFAULT_BASE,
    apiKey,
  };
}

export interface ChatPayload {
  messages: any[];
  tools?: any[];
  stream?: boolean;
  temperature?: number;
}

export async function chatCompletion(cfg: AIConfig, payload: ChatPayload): Promise<Response> {
  const body: Record<string, any> = {
    model: cfg.model,
    messages: payload.messages,
    stream: payload.stream ?? false,
    temperature: payload.temperature ?? 0,
  };
  if (payload.tools && payload.tools.length > 0) body.tools = payload.tools;

  return await fetch(cfg.baseUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
