// otto — Otto 2.0 platform agent. Modular successor to otto-chat:
//   * registry-based tools (read + write + onboarding + support)
//   * auto mode detection (onboarding vs support) from real org state
//   * permission-gated, audited write actions
//   * model/provider configurable via env (defaults to Gemini 2.5 Flash)
//   * progressive SSE streaming of the final answer
//
// Runs ALONGSIDE the legacy otto-chat (which still serves production) until the
// frontend is cut over. See agent_docs and OTTO_2_TESTING.md.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, jsonError, streamText } from "./lib/cors.ts";
import { loadContext } from "./lib/context.ts";
import { buildSystemPrompt } from "./lib/prompts.ts";
import { getAIConfig, chatCompletion } from "./lib/ai.ts";
import { ALL_TOOLS, getToolsForModel, canUseTool, runTool } from "./lib/tools/registry.ts";

const MAX_ITERATIONS = 5;

const MODULE_LABELS: Record<string, string> = {
  clients: "Clientes", leads: "Leads", finance: "Finanças", sales: "Vendas",
  proposals: "Propostas", calendar: "Agenda", marketing: "Marketing",
  ecommerce: "E-commerce", settings: "Definições",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonError("Método não permitido", 405);

  try {
    const { messages, organization_id, attachment_paths } = await req.json();

    let aiConfig;
    try {
      aiConfig = getAIConfig();
    } catch (e) {
      return jsonError((e as Error).message, 500);
    }

    // ── Load context (auth, org, permissions, onboarding, mode) ──
    const { ctx, hasDataAccess } = await loadContext(req, organization_id || null, attachment_paths);

    // Tools available to this user.
    const toolsForModel = (hasDataAccess && ctx)
      ? getToolsForModel({ isAdmin: ctx.isAdmin, permissions: ctx.permissions })
      : [];

    // Which permissioned modules are blocked (for the prompt note).
    let blockedLabels: string[] = [];
    if (hasDataAccess && ctx && !ctx.isAdmin) {
      // Only consider read ("view") tools: a profile that can view a module but
      // not create in it still HAS access to that module's data, so it must not
      // be listed as blocked.
      const blocked = new Set<string>();
      for (const t of ALL_TOOLS) {
        if (t.permission?.action === "view" && !canUseTool(t, { isAdmin: false, permissions: ctx.permissions })) {
          blocked.add(MODULE_LABELS[t.permission.module] || t.permission.module);
        }
      }
      blockedLabels = [...blocked];
    }

    const systemContent = buildSystemPrompt(ctx, { hasDataAccess, blockedLabels });
    let conversationMessages: any[] = [{ role: "system", content: systemContent }, ...messages];

    // ── Tool-calling loop ──
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const resp = await chatCompletion(aiConfig, {
        messages: conversationMessages,
        tools: toolsForModel,
        stream: false,
        temperature: 0,
      });

      if (!resp.ok) {
        const status = resp.status;
        if (status === 429) return jsonError("O Otto está com muitos pedidos. Tenta novamente em alguns segundos.", 429);
        if (status === 402) return jsonError("Créditos de IA esgotados. Contacta o administrador.", 402);
        const errorText = await resp.text();
        console.error("AI gateway error:", status, errorText);
        return jsonError("Erro ao contactar o Otto. Tenta novamente.", 500);
      }

      const result = await resp.json();
      const choice = result.choices?.[0];
      if (!choice) return jsonError("Resposta vazia do modelo.", 500);

      const assistantMessage = choice.message;

      // Tool calls → execute and loop.
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        conversationMessages.push(assistantMessage);
        for (const toolCall of assistantMessage.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, any> = {};
          try { fnArgs = JSON.parse(toolCall.function.arguments || "{}"); } catch { fnArgs = {}; }

          let toolResult: string;
          if (!hasDataAccess || !ctx) {
            toolResult = JSON.stringify({ error: "Sem acesso a dados", _instruction: "O utilizador não está autenticado. Informa-o." });
          } else {
            console.log(`[otto] tool: ${fnName}`, JSON.stringify(fnArgs).slice(0, 200));
            toolResult = await runTool(fnName, fnArgs, ctx);
          }
          conversationMessages.push({ role: "tool", tool_call_id: toolCall.id, content: toolResult });
        }
        continue;
      }

      // Final answer → stream it progressively. We already have the full content
      // (no second model call, so multi-step flows like tickets stay consistent);
      // streamText just chunks it so the client renders word-by-word.
      if (assistantMessage.content) {
        return streamText(assistantMessage.content);
      }
      return jsonError("Resposta vazia do Otto.", 500);
    }

    return streamText("Peço desculpa, não consegui processar o pedido. Tenta reformular a tua pergunta.");
  } catch (e) {
    console.error("otto error:", e);
    return jsonError(e instanceof Error ? e.message : "Erro desconhecido", 500);
  }
});
