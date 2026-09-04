// Read-only tools (search / summaries). Faithful port of the legacy otto-chat
// switch executor into the registry pattern. Behaviour is intentionally
// identical — same RPCs, same shapes, same anti-hallucination _instruction
// strings — so migrating carries no regression risk.
import type { Tool } from "../types.ts";

const ERR = (msg: string) => ({
  error: msg,
  _instruction: "ERRO NA PESQUISA. Informa o utilizador que não foi possível pesquisar. NÃO INVENTES DADOS.",
});
const EMPTY = (entity: string) => ({
  results: [],
  count: 0,
  _instruction: `ZERO RESULTADOS encontrados. Informa o utilizador que não encontraste ${entity} com esse termo. NÃO INVENTES DADOS.`,
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function saleReferenceCandidates(value: string): string[] {
  const raw = value.trim();
  const compact = raw.replace(/^venda\s+/i, "").trim();
  const digits = compact.match(/\d+/)?.[0] || "";
  return [...new Set([
    raw,
    compact,
    digits,
    digits ? digits.padStart(4, "0") : "",
    digits ? String(Number(digits)) : "",
  ].filter(Boolean))];
}

function normalizeLookup(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}@.+-]+/gu, " ")
    .trim();
}

async function resolveSaleId(ctx: any, reference: string): Promise<{ saleId: string | null; error?: string; candidates?: any[] }> {
  const trimmed = reference.trim();
  if (!trimmed) return { saleId: null, error: "Referência da venda em falta" };
  if (UUID_RE.test(trimmed)) return { saleId: trimmed };

  const candidates = saleReferenceCandidates(trimmed);
  const { data, error } = await ctx.supabaseAdmin
    .from("sales")
    .select("id, code, total_value, status, payment_status")
    .eq("organization_id", ctx.orgId)
    .in("code", candidates)
    .limit(10);
  if (error) return { saleId: null, error: error.message };
  if ((data || []).length === 1) return { saleId: data![0].id };
  if ((data || []).length > 1) return { saleId: null, candidates: data || [] };

  const { data: searched, error: searchError } = await ctx.supabaseAdmin
    .rpc("search_sales_unaccent", { org_id: ctx.orgId, search_term: trimmed, pay_status: null, max_results: 10 });
  if (searchError) return { saleId: null, error: searchError.message };
  if ((searched || []).length === 1) return { saleId: searched![0].id };
  if ((searched || []).length > 1) return { saleId: null, candidates: searched || [] };

  return { saleId: null };
}

export const readTools: Tool[] = [
  {
    name: "list_team_members",
    description: "Listar membros ativos da equipa da organização para resolver nomes de comerciais/responsáveis antes de atribuir registos.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Nome ou email do membro a procurar (opcional)" },
        role: { type: "string", description: "Filtrar por role: admin, salesperson, viewer (opcional)" },
      },
    },
    permission: { module: "settings", subarea: "team", action: "view" },
    execute: async (args, ctx) => {
      const { data: members, error: membersError } = await ctx.supabaseAdmin
        .from("organization_members")
        .select("user_id, role, is_active, profile_id")
        .eq("organization_id", ctx.orgId)
        .eq("is_active", true);
      if (membersError) return ERR(membersError.message);
      if (!members || members.length === 0) return EMPTY("membros da equipa");

      const profileIds = members.map((m: any) => m.user_id).filter(Boolean);
      const { data: profiles, error: profilesError } = await ctx.supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", profileIds);
      if (profilesError) return ERR(profilesError.message);

      const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
      const normalizedQuery = typeof args.query === "string" ? normalizeLookup(args.query) : "";
      const normalizedRole = typeof args.role === "string" ? args.role.trim().toLowerCase() : "";
      const results = members
        .map((m: any) => {
          const profile = profileById.get(m.user_id) || {};
          return {
            user_id: m.user_id,
            role: m.role,
            full_name: profile.full_name || null,
            email: profile.email || null,
            phone: profile.phone || null,
          };
        })
        .filter((m: any) => !normalizedRole || m.role === normalizedRole)
        .filter((m: any) => {
          if (!normalizedQuery) return true;
          return [m.full_name, m.email, m.phone]
            .filter(Boolean)
            .map((value: string) => normalizeLookup(value))
            .some((value: string) => value.includes(normalizedQuery) || normalizedQuery.includes(value));
        })
        .slice(0, 20);

      if (results.length === 0) return EMPTY("membros da equipa");
      return { results, count: results.length };
    },
  },
  {
    name: "prepare_sale_creation",
    description: "Preparar registo de uma ou várias vendas: procura clientes/leads pelo nome, resolve comercial por nome/email e identifica que dados ainda faltam antes de pedir confirmação.",
    parameters: {
      type: "object",
      properties: {
        customer_names: {
          type: "array",
          items: { type: "string" },
          description: "Lista de nomes de clientes/leads mencionados pelo utilizador",
        },
        assignee_query: { type: "string", description: "Nome/email do comercial/responsável mencionado (opcional, ex: Sara)" },
      },
      required: ["customer_names"],
    },
    permission: { module: "sales", subarea: "sales", action: "view" },
    execute: async (args, ctx) => {
      const names = Array.isArray(args.customer_names)
        ? args.customer_names.map((name: any) => String(name || "").trim()).filter(Boolean)
        : [];
      if (names.length === 0) {
        return { error: "Nomes em falta", _instruction: "Pede os nomes dos clientes/leads antes de preparar as vendas." };
      }

      let assignee: any = null;
      let assigneeMatches: any[] = [];
      if (typeof args.assignee_query === "string" && args.assignee_query.trim()) {
        const { data: members } = await ctx.supabaseAdmin
          .from("organization_members")
          .select("user_id, role, is_active")
          .eq("organization_id", ctx.orgId)
          .eq("is_active", true);
        const memberIds = (members || []).map((m: any) => m.user_id).filter(Boolean);
        if (memberIds.length > 0) {
          const { data: profiles } = await ctx.supabaseAdmin
            .from("profiles")
            .select("id, full_name, email, phone")
            .in("id", memberIds);
          const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
          const q = normalizeLookup(args.assignee_query);
          assigneeMatches = (members || [])
            .map((m: any) => ({ ...m, ...(profileById.get(m.user_id) || {}) }))
            .filter((m: any) => [m.full_name, m.email, m.phone]
              .filter(Boolean)
              .map((value: string) => normalizeLookup(value))
              .some((value: string) => value.includes(q) || q.includes(value)))
            .map((m: any) => ({ user_id: m.user_id, role: m.role, full_name: m.full_name || null, email: m.email || null }));
          if (assigneeMatches.length === 1) assignee = assigneeMatches[0];
        }
      }

      const prepared = [];
      for (const name of names) {
        const [clientsResult, leadsResult] = await Promise.all([
          ctx.supabaseAdmin.rpc("search_clients_unaccent", { org_id: ctx.orgId, search_term: name, max_results: 5 }),
          ctx.supabaseAdmin.rpc("search_leads_unaccent", { org_id: ctx.orgId, search_term: name, lead_status: null, max_results: 5 }),
        ]);

        if (clientsResult.error || leadsResult.error) {
          prepared.push({
            query: name,
            error: clientsResult.error?.message || leadsResult.error?.message,
            needs: ["resolver cliente/lead", "valor da venda"],
          });
          continue;
        }

        const clients = (clientsResult.data || []).map((c: any) => ({
          type: "client",
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          company: c.company,
          total_sales: c.total_sales,
          historical_total_value: c.total_value,
        }));
        const leads = (leadsResult.data || []).map((l: any) => ({
          type: "lead",
          id: l.id,
          name: l.name,
          email: l.email,
          phone: l.phone,
          status: l.status,
          assigned_to: l.assigned_to,
          estimated_value: l.value,
        }));
        const bestMatch = clients[0] || leads[0] || null;
        let existingSales: any[] = [];
        if (bestMatch) {
          let salesQuery = ctx.supabaseAdmin
            .from("sales")
            .select("id, code, total_value, status, payment_status, sale_date, created_at, client_id, lead_id, created_by")
            .eq("organization_id", ctx.orgId)
            .order("created_at", { ascending: false })
            .limit(5);
          if (bestMatch.type === "client") salesQuery = salesQuery.eq("client_id", bestMatch.id);
          else salesQuery = salesQuery.eq("lead_id", bestMatch.id);

          const { data: sales } = await salesQuery;
          existingSales = (sales || []).map((s: any) => ({
            id: s.id,
            code: s.code,
            total_value: s.total_value,
            status: s.status,
            payment_status: s.payment_status,
            sale_date: s.sale_date,
            created_at: s.created_at,
            created_by: s.created_by,
          }));
        }

        prepared.push({
          query: name,
          best_match: bestMatch,
          client_matches: clients,
          lead_matches: leads,
          existing_sales: existingSales,
          already_has_sales: existingSales.length > 0,
          suggested_total_value: bestMatch?.type === "lead" && typeof bestMatch.estimated_value === "number" && bestMatch.estimated_value > 0 ? bestMatch.estimated_value : null,
          needs: [
            ...(bestMatch ? [] : ["resolver cliente/lead"]),
            ...(existingSales.length > 0 || (bestMatch?.type === "lead" && typeof bestMatch.estimated_value === "number" && bestMatch.estimated_value > 0) ? [] : ["valor da venda"]),
          ],
          recommended_action: existingSales.length > 0
            ? "confirmar com o utilizador se quer criar uma nova venda duplicada ou apenas confirmar/ajustar a venda existente"
            : "pedir confirmação e valor antes de criar a venda",
          note: bestMatch?.type === "client" && Number(bestMatch.historical_total_value || 0) > 0
            ? "historical_total_value é histórico do cliente, não deve ser usado automaticamente como valor da nova venda."
            : undefined,
        });
      }

      return {
        assignee,
        assignee_matches: assigneeMatches,
        prepared,
        _instruction: "Usa estes dados para ser prático: mostra o que encontraste no banco e pede APENAS confirmação/dados em falta. Se already_has_sales=true, não cries duplicado sem confirmação explícita. Não cries venda enquanto faltar valor ou houver ambiguidade. Se houver assignee único, usa-o em create_sale.",
      };
    },
  },
  {
    name: "search_clients",
    description: "Procurar clientes por nome, email, NIF ou empresa. Retorna até 10 resultados.",
    parameters: {
      type: "object",
      properties: { query: { type: "string", description: "Termo de pesquisa (nome, email, NIF ou empresa)" } },
      required: ["query"],
    },
    permission: { module: "clients", subarea: "list", action: "view" },
    execute: async (args, ctx) => {
      const { data, error } = await ctx.supabaseAdmin
        .rpc("search_clients_unaccent", { org_id: ctx.orgId, search_term: args.query, max_results: 10 });
      if (error) return ERR(error.message);
      const results = (data || []).map((c: any) => ({
        id: c.id, code: c.code, name: c.name, email: c.email, phone: c.phone,
        nif: c.nif, company: c.company, status: c.status, total_sales: c.total_sales, total_value: c.total_value,
      }));
      if (results.length === 0) return EMPTY("clientes");
      return { results, count: results.length };
    },
  },
  {
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
    permission: { module: "leads", subarea: "kanban", action: "view" },
    execute: async (args, ctx) => {
      const { data, error } = await ctx.supabaseAdmin
        .rpc("search_leads_unaccent", { org_id: ctx.orgId, search_term: args.query, lead_status: args.status || null, max_results: 10 });
      if (error) return ERR(error.message);
      const results = (data || []).map((l: any) => ({
        id: l.id, name: l.name, email: l.email, phone: l.phone, status: l.status,
        source: l.source, assigned_to: l.assigned_to, created_at: l.created_at, value: l.value,
      }));
      if (results.length === 0) return EMPTY("leads");
      return { results, count: results.length };
    },
  },
  {
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
    permission: { module: "finance", subarea: "invoices", action: "view" },
    execute: async (args, ctx) => {
      const { data, error } = await ctx.supabaseAdmin
        .rpc("search_invoices_unaccent", { org_id: ctx.orgId, search_term: args.query, inv_status: args.status || null, max_results: 10 });
      if (error) return ERR(error.message);
      const results = (data || []).map((i: any) => ({
        id: i.id, invoicexpress_id: i.invoicexpress_id, reference: i.reference,
        client_name: i.client_name, total: i.total, status: i.status,
        date: i.date, due_date: i.due_date, document_type: i.document_type, pdf_path: i.pdf_path,
      }));
      if (results.length === 0) return EMPTY("faturas");
      return { results, count: results.length };
    },
  },
  {
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
    permission: { module: "sales", subarea: "sales", action: "view" },
    execute: async (args, ctx) => {
      const { data, error } = await ctx.supabaseAdmin
        .rpc("search_sales_unaccent", { org_id: ctx.orgId, search_term: args.query, pay_status: args.payment_status || null, max_results: 10 });
      if (error) return ERR(error.message);
      if (!data || data.length === 0) return EMPTY("vendas");
      const clientIds = [...new Set(data.filter((s: any) => s.client_id).map((s: any) => s.client_id))];
      if (clientIds.length > 0) {
        const { data: clients } = await ctx.supabaseAdmin.from("crm_clients").select("id, name").in("id", clientIds);
        const clientMap = Object.fromEntries((clients || []).map((c: any) => [c.id, c.name]));
        data.forEach((s: any) => { s.client_name = clientMap[s.client_id] || null; });
      }
      const userIds = [...new Set(data.flatMap((s: any) => [s.seller_id, s.created_by]).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await ctx.supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds);
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name || p.email]));
        data.forEach((s: any) => {
          s.seller_name = s.seller_id ? profileMap[s.seller_id] || null : null;
          s.created_by_name = s.created_by ? profileMap[s.created_by] || null : null;
        });
      }
      return { results: data, count: data.length };
    },
  },
  {
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
    permission: { module: "proposals", subarea: "proposals", action: "view" },
    execute: async (args, ctx) => {
      const { data, error } = await ctx.supabaseAdmin
        .rpc("search_proposals_unaccent", { org_id: ctx.orgId, search_term: args.query, prop_status: args.status || null, max_results: 10 });
      if (error) return ERR(error.message);
      if (!data || data.length === 0) return EMPTY("propostas");
      const propClientIds = [...new Set(data.filter((p: any) => p.client_id).map((p: any) => p.client_id))];
      if (propClientIds.length > 0) {
        const { data: clients } = await ctx.supabaseAdmin.from("crm_clients").select("id, name").in("id", propClientIds);
        const clientMap = Object.fromEntries((clients || []).map((c: any) => [c.id, c.name]));
        data.forEach((p: any) => { p.client_name = clientMap[p.client_id] || null; });
      }
      return { results: data, count: data.length };
    },
  },
  {
    name: "get_client_details",
    description: "Obter detalhes completos de um cliente específico por ID.",
    parameters: {
      type: "object",
      properties: { client_id: { type: "string", description: "UUID do cliente" } },
      required: ["client_id"],
    },
    permission: { module: "clients", subarea: "list", action: "view" },
    execute: async (args, ctx) => {
      const { data, error } = await ctx.supabaseAdmin
        .from("crm_clients")
        .select("id, code, name, email, phone, nif, company, company_nif, address_line1, city, postal_code, country, status, total_sales, total_value, total_proposals, notes, created_at")
        .eq("organization_id", ctx.orgId)
        .eq("id", args.client_id)
        .maybeSingle();
      if (error) return { error: error.message, _instruction: "ERRO NA PESQUISA. NÃO INVENTES DADOS." };
      if (!data) return { error: "Cliente não encontrado", _instruction: "Cliente não existe na base de dados. Informa o utilizador. NÃO INVENTES DADOS." };
      return data;
    },
  },
  {
    name: "get_sale_details",
    description: "Obter detalhes de uma venda específica incluindo pagamentos. Aceita UUID interno ou código/referência visível da venda, ex: 0002.",
    parameters: {
      type: "object",
      properties: { sale_id: { type: "string", description: "UUID interno ou código/referência visível da venda, ex: 0002" } },
      required: ["sale_id"],
    },
    permission: { module: "sales", subarea: "sales", action: "view" },
    execute: async (args, ctx) => {
      const resolved = await resolveSaleId(ctx, String(args.sale_id || ""));
      if (resolved.error) return { error: resolved.error, _instruction: "ERRO NA PESQUISA. NÃO INVENTES DADOS." };
      if (resolved.candidates?.length) {
        return {
          error: "Mais de uma venda encontrada",
          candidates: resolved.candidates,
          _instruction: "Há mais de uma venda possível. Mostra as opções e pede ao utilizador para escolher. NÃO INVENTES.",
        };
      }
      if (!resolved.saleId) return { error: "Venda não encontrada", _instruction: "Venda não existe na base de dados. Informa o utilizador. NÃO INVENTES DADOS." };

      const { data: sale, error } = await ctx.supabaseAdmin
        .from("sales")
        .select("id, code, total_value, status, payment_status, sale_date, notes, client_id, lead_id, seller_id, created_by")
        .eq("organization_id", ctx.orgId)
        .eq("id", resolved.saleId)
        .maybeSingle();
      if (error) return { error: error.message, _instruction: "ERRO NA PESQUISA. NÃO INVENTES DADOS." };
      if (!sale) return { error: "Venda não encontrada", _instruction: "Venda não existe na base de dados. Informa o utilizador. NÃO INVENTES DADOS." };
      const { data: payments } = await ctx.supabaseAdmin
        .from("sale_payments")
        .select("id, amount, payment_date, payment_method, status, invoice_reference")
        .eq("sale_id", resolved.saleId)
        .eq("organization_id", ctx.orgId);
      if (sale.client_id) {
        const { data: client } = await ctx.supabaseAdmin.from("crm_clients").select("name").eq("id", sale.client_id).maybeSingle();
        (sale as any).client_name = client?.name || null;
      }
      const userIds = [sale.seller_id, sale.created_by].filter(Boolean);
      if (userIds.length > 0) {
        const { data: profiles } = await ctx.supabaseAdmin.from("profiles").select("id, full_name, email").in("id", userIds);
        const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name || p.email]));
        (sale as any).seller_name = sale.seller_id ? profileMap[sale.seller_id] || null : null;
        (sale as any).created_by_name = sale.created_by ? profileMap[sale.created_by] || null : null;
      }
      return { sale, payments: payments || [] };
    },
  },
  {
    name: "get_pipeline_summary",
    description: "Obter resumo do pipeline de leads: contagem por etapa e total.",
    parameters: { type: "object", properties: {}, required: [] },
    permission: { module: "leads", subarea: "kanban", action: "view" },
    execute: async (_args, ctx) => {
      const { data: stages } = await ctx.supabaseAdmin
        .from("pipeline_stages").select("key, label:name").eq("organization_id", ctx.orgId).order("position");
      const { data: leads } = await ctx.supabaseAdmin.from("leads").select("status").eq("organization_id", ctx.orgId);
      const counts: Record<string, number> = {};
      (leads || []).forEach((l: any) => { counts[l.status] = (counts[l.status] || 0) + 1; });
      const summary = (stages || []).map((s: any) => ({ stage: s.label, key: s.key, count: counts[s.key] || 0 }));
      return { stages: summary, total_leads: leads?.length || 0 };
    },
  },
  {
    name: "get_finance_summary",
    description: "Obter resumo financeiro de um período: total faturado, recebido, pendente, despesas e balanço. Se não forem fornecidas datas, usa o mês atual.",
    parameters: {
      type: "object",
      properties: {
        start_date: { type: "string", description: "Data início YYYY-MM-DD (opcional, default: início do mês atual)" },
        end_date: { type: "string", description: "Data fim YYYY-MM-DD (opcional, default: fim do mês atual)" },
      },
      required: [],
    },
    permission: { module: "finance", subarea: "summary", action: "view" },
    execute: async (args, ctx) => {
      const now = new Date();
      const startDate = args.start_date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const endDateDefault = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const endDate = args.end_date || `${endDateDefault.getFullYear()}-${String(endDateDefault.getMonth() + 1).padStart(2, "0")}-${String(endDateDefault.getDate()).padStart(2, "0")}`;
      const { data: sales } = await ctx.supabaseAdmin
        .from("sales").select("id, total_value, sale_date").eq("organization_id", ctx.orgId).gte("sale_date", startDate).lte("sale_date", endDate);
      const totalBilled = (sales || []).reduce((s: number, r: any) => s + Number(r.total_value || 0), 0);
      const { data: payments } = await ctx.supabaseAdmin
        .from("sale_payments").select("amount, status").eq("organization_id", ctx.orgId).gte("payment_date", startDate).lte("payment_date", endDate);
      const totalReceived = (payments || []).filter((p: any) => p.status === "paid").reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const totalPending = (payments || []).filter((p: any) => p.status === "pending").reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      const { data: expenses } = await ctx.supabaseAdmin
        .from("expenses").select("amount").eq("organization_id", ctx.orgId).gte("expense_date", startDate).lte("expense_date", endDate);
      const totalExpenses = (expenses || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
      return {
        period: { start: startDate, end: endDate },
        total_billed: totalBilled, total_received: totalReceived, total_pending: totalPending,
        total_expenses: totalExpenses, balance: totalReceived - totalExpenses, total_sales_count: sales?.length || 0,
      };
    },
  },
  {
    name: "get_upcoming_events",
    description: "Obter próximos eventos da agenda nos próximos N dias.",
    parameters: {
      type: "object",
      properties: { days: { type: "number", description: "Número de dias a consultar (default: 7)" } },
      required: [],
    },
    permission: { module: "calendar", subarea: "events", action: "view" },
    execute: async (args, ctx) => {
      const days = args.days || 7;
      const now = new Date().toISOString();
      const future = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await ctx.supabaseAdmin
        .from("calendar_events")
        .select("id, title, event_type, start_time, end_time, description, status")
        .eq("organization_id", ctx.orgId).gte("start_time", now).lte("start_time", future).order("start_time").limit(10);
      if (error) return { error: error.message, _instruction: "ERRO NA PESQUISA. NÃO INVENTES DADOS." };
      if (!data || data.length === 0) return { events: [], count: 0, _instruction: "ZERO eventos encontrados no período. Informa o utilizador. NÃO INVENTES DADOS." };
      return { events: data, count: data.length };
    },
  },
  {
    name: "search_credit_notes",
    description: "Procurar notas de crédito por referência ou nome do cliente. Retorna até 10 resultados.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Referência da nota de crédito ou nome do cliente" },
        status: { type: "string", description: "Filtrar por status (opcional)" },
      },
      required: ["query"],
    },
    permission: { module: "finance", subarea: "invoices", action: "view" },
    execute: async (args, ctx) => {
      const { data, error } = await ctx.supabaseAdmin
        .rpc("search_credit_notes_unaccent", { org_id: ctx.orgId, search_term: args.query, cn_status: args.status || null, max_results: 10 });
      if (error) return ERR(error.message);
      const results = (data || []).map((cn: any) => ({
        id: cn.id, reference: cn.reference, client_name: cn.client_name,
        total: cn.total, status: cn.status, date: cn.date, pdf_path: cn.pdf_path,
      }));
      if (results.length === 0) return EMPTY("notas de crédito");
      return { results, count: results.length };
    },
  },
];
