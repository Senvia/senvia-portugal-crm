import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `IDENTIDADE: És o Otto, a Inteligência Artificial de suporte interno do Senvia OS. O teu objetivo é ajudar os utilizadores a navegarem no sistema, configurarem módulos e resolverem dúvidas técnicas de forma rápida e autónoma. És profissional, direto, altamente eficiente e educado. Não usas jargão técnico desnecessário. Não fazes conversa fiada. Falas sempre em Português de Portugal (PT-PT).

CAPACIDADE DE ACESSO A DADOS:
Tens acesso à base de dados da organização do utilizador autenticado. Podes pesquisar clientes, leads, faturas, vendas, propostas, eventos da agenda e obter resumos financeiros e do pipeline.

REGRAS DE ACESSO A DADOS:
- NUNCA inventes dados. Usa APENAS os resultados das ferramentas.
- REGRA ABSOLUTA ANTI-ALUCINAÇÃO: Se uma ferramenta retornar um erro, falhar, ou retornar zero resultados, diz EXATAMENTE "Não encontrei resultados para [termo pesquisado]" e sugere termos alternativos. NUNCA, em circunstância alguma, inventes registos, referências, nomes de clientes ou valores. Se não tens dados reais, NÃO os fabrica.
- Faz SEMPRE perguntas de clarificação antes de pesquisar (ex: "Qual o nome do cliente?", "Quer procurar por referência ou nome?").
- Quando encontras resultados, formata-os de forma clara com **negrito** e listas.
- Se não encontras resultados, sugere termos alternativos ou ortografias diferentes.
- Quando mostras registos, inclui links de navegação para a página relevante.
- Limita as pesquisas — não faças queries desnecessárias.

FLUXO OBRIGATÓRIO (segue SEMPRE estes 4 passos):

1. INTERPRETAÇÃO: Analisa a intenção do utilizador e mapeia-a para os módulos do Senvia OS.

2. CLARIFICAÇÃO (BOTÕES): Nunca dês a resposta completa logo de imediato. Se precisas de mais contexto, responde com uma frase curta e gera 2 a 3 opções (botões) para o utilizador escolher o cenário exato. Formato: [botao:Texto do botão]
   EXCEÇÃO: Se o utilizador já deu informação suficiente para pesquisar (ex: "mostra a fatura do cliente João Silva"), usa diretamente a ferramenta sem pedir clarificação adicional.

3. INSTRUÇÃO PASSO-A-PASSO: Quando o utilizador escolhe uma opção, fornece instruções em lista numerada, sendo extremamente preciso com os nomes dos menus (ex: "Definições > Integrações > Brevo").

4. FRONTEIRA DE CONHECIMENTO: Se a pergunta não tem a ver com o Senvia OS, responde: "Sou o Otto, o assistente técnico do Senvia OS. Apenas consigo ajudar com dúvidas sobre a utilização desta plataforma."

EXEMPLOS DE INTERAÇÃO COM DADOS:

Utilizador: "Preciso da fatura do cliente João"
Otto: (usa ferramenta search_invoices com query "João")
Se encontrar: "Encontrei as faturas do cliente João Silva:
- **FT 2024/152** — 1.500,00 € — Paga — 15/01/2024
- **FT 2024/187** — 800,00 € — Pendente — 22/02/2024"
[link:Ver Faturas|/finance/invoices]
[botao:Procurar outra fatura]

Utilizador: "Quantos leads tenho este mês?"
Otto: (usa ferramenta get_pipeline_summary)
Mostra resumo com contagens por etapa.
[link:Ver Pipeline|/leads]

LINKS DE NAVEGAÇÃO:
Sempre que a resposta envolver uma ação ou página específica do sistema, INCLUI um link direto usando o formato: [link:Texto do botão|/caminho]

MAPA DE ROTAS:
- /dashboard → Painel principal
- /leads → Pipeline de Leads
- /clients → Clientes
- /calendar → Agenda
- /proposals → Propostas
- /sales → Vendas
- /finance → Financeiro
- /finance/payments → Pagamentos
- /finance/invoices → Faturas
- /finance/expenses → Despesas
- /marketing → Marketing
- /marketing/templates → Templates de Email
- /marketing/lists → Listas de Contactos
- /marketing/campaigns → Campanhas
- /marketing/reports → Relatórios Marketing
- /ecommerce → E-commerce
- /settings → Definições

REGRAS DE FORMATAÇÃO:
- Máximo 200 palavras por resposta
- 2 a 4 botões por resposta (formato: [botao:Texto])
- Inclui SEMPRE pelo menos 1 link quando a resposta se refere a uma página específica
- Usa markdown: **negrito**, listas numeradas
- Máximo 1-2 emojis por resposta
- Sê extremamente preciso nos caminhos dos menus
- NUNCA comeces a resposta com afirmações ou validações como "Claro!", "Com certeza!", "Sem problema!", "Entendido!", "Boa pergunta!", "Ótima escolha!", "Perfeito!", "Excelente!". Vai direto ao assunto sem preâmbulos.`;

// ─── Tool Definitions ───
const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_clients",
      description: "Procurar clientes por nome, email, NIF ou empresa. Retorna até 10 resultados.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de pesquisa (nome, email, NIF ou empresa)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_leads",
      description: "Procurar leads por nome, email ou telefone. Retorna até 10 resultados.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Termo de pesquisa (nome, email ou telefone)" },
          status: { type: "string", description: "Filtrar por status/etapa do pipeline (opcional)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_invoices",
      description: "Procurar faturas por referência ou nome do cliente. Retorna até 10 resultados.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Referência da fatura ou nome do cliente" },
          status: { type: "string", description: "Filtrar por status: final, sent, settled, canceled (opcional)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_sales",
      description: "Procurar vendas por código ou nome do cliente. Retorna até 10 resultados.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Código da venda ou nome do cliente" },
          payment_status: { type: "string", description: "Filtrar por estado: pending, partial, paid (opcional)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_proposals",
      description: "Procurar propostas por código ou nome do cliente. Retorna até 10 resultados.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Código da proposta ou nome do cliente" },
          status: { type: "string", description: "Filtrar por status: draft, sent, accepted, rejected (opcional)" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_details",
      description: "Obter detalhes completos de um cliente específico por ID.",
      parameters: {
        type: "object",
        properties: {
          client_id: { type: "string", description: "UUID do cliente" },
        },
        required: ["client_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_sale_details",
      description: "Obter detalhes de uma venda específica incluindo pagamentos.",
      parameters: {
        type: "object",
        properties: {
          sale_id: { type: "string", description: "UUID da venda" },
        },
        required: ["sale_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pipeline_summary",
      description: "Obter resumo do pipeline de leads: contagem por etapa e total.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_finance_summary",
      description: "Obter resumo financeiro: total faturado, recebido, pendente, despesas e balanço.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "get_upcoming_events",
      description: "Obter próximos eventos da agenda nos próximos N dias.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Número de dias a consultar (default: 7)" },
        },
        required: [],
      },
    },
  },
];

// ─── Tool Executors ───
async function executeTool(
  toolName: string,
  args: Record<string, any>,
  orgId: string,
  supabaseAdmin: any
): Promise<string> {
  try {
    switch (toolName) {
      case "search_clients": {
        const { data, error } = await supabaseAdmin
          .rpc("search_clients_unaccent", { org_id: orgId, search_term: args.query, max_results: 10 });
        if (error) return JSON.stringify({ error: error.message });
        const results = (data || []).map((c: any) => ({
          id: c.id, code: c.code, name: c.name, email: c.email, phone: c.phone,
          nif: c.nif, company: c.company, status: c.status, total_sales: c.total_sales, total_value: c.total_value,
        }));
        return JSON.stringify({ results, count: results.length });
      }

      case "search_leads": {
        const { data, error } = await supabaseAdmin
          .rpc("search_leads_unaccent", {
            org_id: orgId, search_term: args.query,
            lead_status: args.status || null, max_results: 10,
          });
        if (error) return JSON.stringify({ error: error.message });
        const results = (data || []).map((l: any) => ({
          id: l.id, name: l.name, email: l.email, phone: l.phone, status: l.status,
          source: l.source, assigned_to: l.assigned_to, created_at: l.created_at, value: l.value,
        }));
        return JSON.stringify({ results, count: results.length });
      }

      case "search_invoices": {
        const { data, error } = await supabaseAdmin
          .rpc("search_invoices_unaccent", {
            org_id: orgId, search_term: args.query,
            inv_status: args.status || null, max_results: 10,
          });
        if (error) return JSON.stringify({ error: error.message });
        const results = (data || []).map((i: any) => ({
          id: i.id, invoicexpress_id: i.invoicexpress_id, reference: i.reference,
          client_name: i.client_name, total: i.total, status: i.status,
          date: i.date, due_date: i.due_date, document_type: i.document_type, pdf_path: i.pdf_path,
        }));
        return JSON.stringify({ results, count: results.length });
      }

      case "search_sales": {
        const { data, error } = await supabaseAdmin
          .rpc("search_sales_unaccent", {
            org_id: orgId, search_term: args.query,
            pay_status: args.payment_status || null, max_results: 10,
          });
        if (error) return JSON.stringify({ error: error.message });
        // Enrich with client names
        if (data && data.length > 0) {
          const clientIds = [...new Set(data.filter((s: any) => s.client_id).map((s: any) => s.client_id))];
          if (clientIds.length > 0) {
            const { data: clients } = await supabaseAdmin
              .from("crm_clients")
              .select("id, name")
              .in("id", clientIds);
            const clientMap = Object.fromEntries((clients || []).map((c: any) => [c.id, c.name]));
            data.forEach((s: any) => { s.client_name = clientMap[s.client_id] || null; });
          }
        }
        return JSON.stringify({ results: data || [], count: data?.length || 0 });
      }

      case "search_proposals": {
        const { data, error } = await supabaseAdmin
          .rpc("search_proposals_unaccent", {
            org_id: orgId, search_term: args.query,
            prop_status: args.status || null, max_results: 10,
          });
        if (error) return JSON.stringify({ error: error.message });
        // Enrich with client names
        if (data && data.length > 0) {
          const clientIds = [...new Set(data.filter((p: any) => p.client_id).map((p: any) => p.client_id))];
          if (clientIds.length > 0) {
            const { data: clients } = await supabaseAdmin
              .from("crm_clients")
              .select("id, name")
              .in("id", clientIds);
            const clientMap = Object.fromEntries((clients || []).map((c: any) => [c.id, c.name]));
            data.forEach((p: any) => { p.client_name = clientMap[p.client_id] || null; });
          }
        }
        return JSON.stringify({ results: data || [], count: data?.length || 0 });
      }

      case "get_client_details": {
        const { data, error } = await supabaseAdmin
          .from("crm_clients")
          .select("id, code, name, email, phone, nif, company, company_nif, address_line1, city, postal_code, country, status, total_sales, total_value, total_proposals, notes, created_at")
          .eq("organization_id", orgId)
          .eq("id", args.client_id)
          .maybeSingle();
        if (error) return JSON.stringify({ error: error.message });
        if (!data) return JSON.stringify({ error: "Cliente não encontrado" });
        return JSON.stringify(data);
      }

      case "get_sale_details": {
        const { data: sale, error } = await supabaseAdmin
          .from("sales")
          .select("id, code, total_value, payment_status, sale_date, notes, client_id, lead_id")
          .eq("organization_id", orgId)
          .eq("id", args.sale_id)
          .maybeSingle();
        if (error) return JSON.stringify({ error: error.message });
        if (!sale) return JSON.stringify({ error: "Venda não encontrada" });
        // Get payments
        const { data: payments } = await supabaseAdmin
          .from("sale_payments")
          .select("id, amount, payment_date, payment_method, status, invoice_reference")
          .eq("sale_id", args.sale_id)
          .eq("organization_id", orgId);
        // Get client name
        if (sale.client_id) {
          const { data: client } = await supabaseAdmin
            .from("crm_clients")
            .select("name")
            .eq("id", sale.client_id)
            .maybeSingle();
          sale.client_name = client?.name || null;
        }
        return JSON.stringify({ sale, payments: payments || [] });
      }

      case "get_pipeline_summary": {
        const { data: stages } = await supabaseAdmin
          .from("pipeline_stages")
          .select("key, label")
          .eq("organization_id", orgId)
          .order("position");
        const { data: leads } = await supabaseAdmin
          .from("leads")
          .select("status")
          .eq("organization_id", orgId);
        const counts: Record<string, number> = {};
        (leads || []).forEach((l: any) => {
          counts[l.status] = (counts[l.status] || 0) + 1;
        });
        const summary = (stages || []).map((s: any) => ({
          stage: s.label,
          key: s.key,
          count: counts[s.key] || 0,
        }));
        return JSON.stringify({ stages: summary, total_leads: leads?.length || 0 });
      }

      case "get_finance_summary": {
        // Total from sales
        const { data: sales } = await supabaseAdmin
          .from("sales")
          .select("total_value, payment_status")
          .eq("organization_id", orgId);
        const totalBilled = (sales || []).reduce((s: number, r: any) => s + (r.total_value || 0), 0);
        const totalPaid = (sales || []).filter((s: any) => s.payment_status === "paid").reduce((s: number, r: any) => s + (r.total_value || 0), 0);
        const totalPending = (sales || []).filter((s: any) => s.payment_status !== "paid").reduce((s: number, r: any) => s + (r.total_value || 0), 0);
        // Expenses
        const { data: expenses } = await supabaseAdmin
          .from("expenses")
          .select("amount")
          .eq("organization_id", orgId);
        const totalExpenses = (expenses || []).reduce((s: number, r: any) => s + (r.amount || 0), 0);
        return JSON.stringify({
          total_billed: totalBilled,
          total_received: totalPaid,
          total_pending: totalPending,
          total_expenses: totalExpenses,
          balance: totalPaid - totalExpenses,
          total_sales_count: sales?.length || 0,
        });
      }

      case "get_upcoming_events": {
        const days = args.days || 7;
        const now = new Date().toISOString();
        const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabaseAdmin
          .from("calendar_events")
          .select("id, title, event_type, start_time, end_time, description, status")
          .eq("organization_id", orgId)
          .gte("start_time", now)
          .lte("start_time", future)
          .order("start_time")
          .limit(10);
        if (error) return JSON.stringify({ error: error.message });
        return JSON.stringify({ events: data || [], count: data?.length || 0 });
      }

      default:
        return JSON.stringify({ error: `Ferramenta desconhecida: ${toolName}` });
    }
  } catch (e) {
    console.error(`Tool ${toolName} error:`, e);
    return JSON.stringify({ error: `Erro ao executar ${toolName}` });
  }
}

// ─── Main Handler ───
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, organization_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // ── Auth: validate user ──
    const authHeader = req.headers.get("Authorization") || "";
    let orgId = organization_id || null;

    // Create user-scoped client for auth validation
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    let userId: string | null = null;
    if (authHeader.startsWith("Bearer ") && authHeader !== `Bearer ${SUPABASE_ANON_KEY}`) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data, error } = await supabaseAuth.auth.getUser(token);
        if (!error && data?.user) {
          userId = data.user.id;
        }
      } catch { /* unauthenticated — tools won't be available */ }
    }

    // Create admin client for DB queries
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validate org membership if we have a user
    if (userId && orgId) {
      const { data: membership } = await supabaseAdmin
        .from("organization_members")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .maybeSingle();

      // Also check super_admin
      if (!membership) {
        const { data: superRole } = await supabaseAdmin
          .from("user_roles")
          .select("id")
          .eq("user_id", userId)
          .eq("role", "super_admin")
          .maybeSingle();
        if (!superRole) {
          orgId = null; // Can't access this org — disable tools
        }
      }
    }

    const hasDataAccess = !!userId && !!orgId;

    // ── Fetch user permissions for tool filtering ──
    const TOOL_PERMISSION_MAP: Record<string, { module: string; subarea: string; action: string }> = {
      search_clients:       { module: "clients",   subarea: "list",      action: "view" },
      get_client_details:   { module: "clients",   subarea: "list",      action: "view" },
      search_leads:         { module: "leads",     subarea: "kanban",    action: "view" },
      search_invoices:      { module: "finance",   subarea: "invoices",  action: "view" },
      search_sales:         { module: "sales",     subarea: "sales",     action: "view" },
      search_proposals:     { module: "proposals", subarea: "proposals", action: "view" },
      get_sale_details:     { module: "sales",     subarea: "sales",     action: "view" },
      get_pipeline_summary: { module: "leads",     subarea: "kanban",    action: "view" },
      get_finance_summary:  { module: "finance",   subarea: "summary",   action: "view" },
      get_upcoming_events:  { module: "calendar",  subarea: "events",    action: "view" },
      search_credit_notes:  { module: "finance",   subarea: "invoices",  action: "view" },
    };

    function canUseTool(toolName: string, permissions: any, isAdmin: boolean): boolean {
      if (isAdmin) return true;
      const req = TOOL_PERMISSION_MAP[toolName];
      if (!req) return true; // tools not in map are always allowed
      if (!permissions) return false;
      const mod = permissions[req.module];
      if (!mod?.subareas) return false;
      const sub = mod.subareas[req.subarea];
      if (!sub) return false;
      return sub[req.action] === true;
    }

    let userPermissions: Record<string, any> | null = null;
    let isAdminUser = false;

    if (hasDataAccess) {
      // Check admin/super_admin role
      const { data: adminRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .in("role", ["admin", "super_admin"]);

      isAdminUser = !!(adminRole && adminRole.length > 0);

      if (!isAdminUser) {
        const { data: member } = await supabaseAdmin
          .from("organization_members")
          .select("profile_id")
          .eq("user_id", userId!)
          .eq("organization_id", orgId!)
          .maybeSingle();

        if (member?.profile_id) {
          const { data: profile } = await supabaseAdmin
            .from("organization_profiles")
            .select("module_permissions")
            .eq("id", member.profile_id)
            .maybeSingle();

          userPermissions = profile?.module_permissions || null;
        }
      }
    }

    const toolsForModel = hasDataAccess
      ? TOOLS.filter(t => canUseTool(t.function.name, userPermissions, isAdminUser))
      : [];

    // Build system prompt extra for blocked modules
    let systemPromptExtra = "";
    if (hasDataAccess && !isAdminUser) {
      const blockedModules = Object.entries(TOOL_PERMISSION_MAP)
        .filter(([name]) => !canUseTool(name, userPermissions, isAdminUser))
        .map(([_, perm]) => perm.module);
      const uniqueBlocked = [...new Set(blockedModules)];

      if (uniqueBlocked.length > 0) {
        const moduleLabels: Record<string, string> = {
          clients: "Clientes", leads: "Leads", finance: "Finanças",
          sales: "Vendas", proposals: "Propostas", calendar: "Agenda",
          marketing: "Marketing", ecommerce: "E-commerce", settings: "Definições",
        };
        const blockedLabels = uniqueBlocked.map(m => moduleLabels[m] || m);
        systemPromptExtra = `\n\nRESTRIÇÕES DO PERFIL: Este utilizador NÃO tem acesso aos módulos: ${blockedLabels.join(', ')}. Se perguntar sobre estes módulos, informa educadamente que não tem permissão para aceder a esses dados e sugere contactar o administrador da organização.`;
      }
    }

    // ── Build messages ──
    const systemContent = SYSTEM_PROMPT + systemPromptExtra + (hasDataAccess ? "" : "\n\nNOTA: O utilizador não está autenticado ou sem organização. Não tens acesso a dados da BD. Responde apenas com conhecimento geral do sistema.");
    const allMessages = [
      { role: "system", content: systemContent },
      ...messages,
    ];

    // ── Tool-calling loop (max 3 iterations) ──
    let conversationMessages = [...allMessages];
    const MAX_ITERATIONS = 3;

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const payload: any = {
        model: "google/gemini-3-flash-preview",
        messages: conversationMessages,
        stream: false,
      };
      if (toolsForModel.length > 0) {
        payload.tools = toolsForModel;
      }

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const status = resp.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "O Otto está com muitos pedidos. Tenta novamente em alguns segundos." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "Créditos de IA esgotados. Contacta o administrador." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await resp.text();
        console.error("AI gateway error:", status, errorText);
        return new Response(
          JSON.stringify({ error: "Erro ao contactar o Otto. Tenta novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await resp.json();
      const choice = result.choices?.[0];

      if (!choice) {
        return new Response(
          JSON.stringify({ error: "Resposta vazia do modelo." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const assistantMessage = choice.message;

      // Check if the model wants to call tools
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        // Add assistant message with tool_calls
        conversationMessages.push(assistantMessage);

        // Execute each tool call
        for (const toolCall of assistantMessage.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, any> = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch { fnArgs = {}; }

          console.log(`Executing tool: ${fnName}`, fnArgs);
          const toolResult = await executeTool(fnName, fnArgs, orgId!, supabaseAdmin);

          conversationMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: toolResult,
          });
        }
        // Continue loop — model will process tool results
        continue;
      }

      // No tool calls — we have the final answer. Stream it back.
      // Make a streaming call with the final conversation
      const streamPayload: any = {
        model: "google/gemini-3-flash-preview",
        messages: conversationMessages,
        stream: true,
      };
      // Don't include tools in the final streaming call
      const streamResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(streamPayload),
      });

      if (!streamResp.ok) {
        // If the non-tool response already has content, just return it as a simple SSE
        if (assistantMessage.content) {
          const simpleSSE = `data: ${JSON.stringify({ choices: [{ delta: { content: assistantMessage.content } }] })}\n\ndata: [DONE]\n\n`;
          return new Response(simpleSSE, {
            headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
          });
        }
        return new Response(
          JSON.stringify({ error: "Erro na resposta do Otto." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(streamResp.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // If we hit max iterations, return a fallback message
    const fallbackSSE = `data: ${JSON.stringify({ choices: [{ delta: { content: "Peço desculpa, não consegui processar o pedido. Tenta reformular a tua pergunta." } }] })}\n\ndata: [DONE]\n\n`;
    return new Response(fallbackSSE, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("otto-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
