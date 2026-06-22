// Basic write tools: create a lead, create a client, move a lead between
// pipeline stages. All gated by permission (admins bypass) and audited.
import type { Tool } from "../types.ts";

// Resolve the pipeline stage key to use. If the caller passed one, validate it;
// otherwise fall back to the first stage by position.
async function resolveStageKey(ctx: any, requested?: string): Promise<{ key: string | null; error?: string }> {
  const { data: stages } = await ctx.supabaseAdmin
    .from("pipeline_stages")
    .select("key, name, position")
    .eq("organization_id", ctx.orgId)
    .order("position");
  if (!stages || stages.length === 0) return { key: null, error: "A organização ainda não tem etapas de pipeline configuradas." };
  if (requested) {
    const match = stages.find((s: any) => s.key === requested || s.name?.toLowerCase() === requested.toLowerCase());
    if (!match) return { key: null, error: `Etapa "${requested}" não existe. Etapas válidas: ${stages.map((s: any) => s.name).join(", ")}.` };
    return { key: match.key };
  }
  return { key: stages[0].key };
}

export const writeTools: Tool[] = [
  {
    name: "create_lead",
    description: "Criar uma nova lead no CRM. Usa APENAS depois de confirmares os dados com o utilizador. Nome, email e telefone são obrigatórios.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome completo da lead" },
        email: { type: "string", description: "Email da lead" },
        phone: { type: "string", description: "Telefone da lead (com indicativo)" },
        company_name: { type: "string", description: "Nome da empresa (opcional)" },
        value: { type: "number", description: "Valor estimado do negócio (opcional)" },
        stage: { type: "string", description: "Etapa do pipeline (opcional, default: primeira etapa)" },
        notes: { type: "string", description: "Notas adicionais (opcional)" },
      },
      required: ["name", "email", "phone"],
    },
    permission: { module: "leads", subarea: "kanban", action: "create" },
    isWrite: true,
    execute: async (args, ctx) => {
      if (!args.name || !args.email || !args.phone) {
        return { error: "Faltam dados", _instruction: "Pede o nome, email e telefone em falta antes de criar a lead. NÃO inventes dados." };
      }
      const { key, error: stageErr } = await resolveStageKey(ctx, args.stage);
      if (stageErr) return { error: stageErr, _instruction: "Informa o utilizador deste problema com a etapa do pipeline." };
      const { data, error } = await ctx.supabaseAdmin
        .from("leads")
        .insert({
          organization_id: ctx.orgId,
          name: args.name,
          email: args.email,
          phone: args.phone,
          company_name: args.company_name || null,
          value: typeof args.value === "number" ? args.value : null,
          status: key,
          notes: args.notes || null,
          source: "otto",
        })
        .select("id, name, status")
        .single();
      if (error) {
        return { error: error.message, _instruction: "ERRO ao criar a lead. Informa o utilizador que houve um problema técnico. NÃO digas que foi criada." };
      }
      return {
        success: true,
        lead_id: data.id,
        _instruction: `Lead **${data.name}** criada com sucesso. Informa o utilizador e oferece um link para a ver. [link:Ver Leads|/leads]`,
      };
    },
  },
  {
    name: "create_client",
    description: "Criar um novo cliente no CRM. Usa APENAS depois de confirmares os dados. O nome é obrigatório.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Nome do cliente" },
        email: { type: "string", description: "Email (opcional)" },
        phone: { type: "string", description: "Telefone (opcional)" },
        nif: { type: "string", description: "NIF (opcional)" },
        company: { type: "string", description: "Empresa (opcional)" },
        notes: { type: "string", description: "Notas (opcional)" },
      },
      required: ["name"],
    },
    permission: { module: "clients", subarea: "list", action: "create" },
    isWrite: true,
    execute: async (args, ctx) => {
      if (!args.name) return { error: "Nome em falta", _instruction: "Pede o nome do cliente antes de criar." };
      const { data, error } = await ctx.supabaseAdmin
        .from("crm_clients")
        .insert({
          organization_id: ctx.orgId,
          name: args.name,
          email: args.email || null,
          phone: args.phone || null,
          nif: args.nif || null,
          company: args.company || null,
          notes: args.notes || null,
          source: "otto",
        })
        .select("id, name")
        .single();
      if (error) {
        return { error: error.message, _instruction: "ERRO ao criar o cliente. Informa o utilizador. NÃO digas que foi criado." };
      }
      return {
        success: true,
        client_id: data.id,
        _instruction: `Cliente **${data.name}** criado com sucesso. Informa o utilizador. [link:Ver Clientes|/clients]`,
      };
    },
  },
  {
    name: "update_lead_status",
    description: "Mover uma lead para outra etapa do pipeline. Precisa do ID da lead (obtém-no com search_leads) e da etapa destino.",
    parameters: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "UUID da lead" },
        stage: { type: "string", description: "Etapa destino (nome ou key da etapa)" },
      },
      required: ["lead_id", "stage"],
    },
    permission: { module: "leads", subarea: "kanban", action: "edit" },
    isWrite: true,
    execute: async (args, ctx) => {
      const { key, error: stageErr } = await resolveStageKey(ctx, args.stage);
      if (stageErr || !key) return { error: stageErr || "Etapa inválida", _instruction: "Informa o utilizador da etapa inválida e lista as válidas." };
      const { data, error } = await ctx.supabaseAdmin
        .from("leads")
        .update({ status: key })
        .eq("organization_id", ctx.orgId)
        .eq("id", args.lead_id)
        .select("id, name, status")
        .maybeSingle();
      if (error) return { error: error.message, _instruction: "ERRO ao mover a lead. Informa o utilizador." };
      if (!data) return { error: "Lead não encontrada", _instruction: "A lead não existe nesta organização. Informa o utilizador. NÃO inventes." };
      return {
        success: true,
        _instruction: `Lead **${data.name}** movida para a etapa solicitada. Informa o utilizador. [link:Ver Pipeline|/leads]`,
      };
    },
  },
  {
    name: "create_sale",
    description: "Registar uma nova venda no CRM. É o momento-chave da ativação (o utilizador vê dinheiro a entrar). Usa APENAS depois de confirmares o valor com o utilizador. O valor total é obrigatório.",
    parameters: {
      type: "object",
      properties: {
        total_value: { type: "number", description: "Valor total da venda em euros (obrigatório)" },
        client_id: { type: "string", description: "UUID do cliente associado (opcional, obtém-no com search_clients)" },
        lead_id: { type: "string", description: "UUID da lead de origem (opcional, obtém-no com search_leads)" },
        notes: { type: "string", description: "Notas sobre a venda (opcional)" },
      },
      required: ["total_value"],
    },
    permission: { module: "sales", subarea: "sales", action: "create" },
    isWrite: true,
    execute: async (args, ctx) => {
      if (typeof args.total_value !== "number" || !(args.total_value > 0)) {
        return { error: "Valor em falta", _instruction: "Pede o valor total da venda (um número maior que zero) antes de a registar. NÃO inventes valores." };
      }
      // If a client_id was given, confirm it belongs to this org (avoid cross-tenant linkage).
      if (args.client_id) {
        const { data: client } = await ctx.supabaseAdmin
          .from("crm_clients")
          .select("id")
          .eq("organization_id", ctx.orgId)
          .eq("id", args.client_id)
          .maybeSingle();
        if (!client) return { error: "Cliente não encontrado", _instruction: "O cliente indicado não existe nesta organização. Usa search_clients para confirmar. NÃO inventes." };
      }
      const { data, error } = await ctx.supabaseAdmin
        .from("sales")
        .insert({
          organization_id: ctx.orgId,
          total_value: args.total_value,
          status: "pending",
          client_id: args.client_id || null,
          lead_id: args.lead_id || null,
          notes: args.notes || null,
          created_by: ctx.userId || null,
        })
        .select("id, total_value")
        .single();
      if (error) {
        return { error: error.message, _instruction: "ERRO ao registar a venda. Informa o utilizador que houve um problema técnico. NÃO digas que foi registada." };
      }
      return {
        success: true,
        sale_id: data.id,
        _instruction: `Venda de **${data.total_value}€** registada com sucesso. Celebra com o utilizador (este é o momento em que vê dinheiro a entrar no Senvia OS) e oferece um link. [link:Ver Vendas|/sales]`,
      };
    },
  },
  {
    name: "create_proposal",
    description: "Criar uma proposta para uma lead. Precisa do ID da lead (obtém-no com search_leads) e do valor total. Usa APENAS depois de confirmares os dados.",
    parameters: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "UUID da lead destinatária (obrigatório, obtém-no com search_leads)" },
        total_value: { type: "number", description: "Valor total da proposta em euros (obrigatório)" },
        notes: { type: "string", description: "Notas / descrição da proposta (opcional)" },
      },
      required: ["lead_id", "total_value"],
    },
    permission: { module: "proposals", subarea: "proposals", action: "create" },
    isWrite: true,
    execute: async (args, ctx) => {
      if (!args.lead_id) return { error: "Lead em falta", _instruction: "Uma proposta tem de estar associada a uma lead. Usa search_leads para encontrar a lead. NÃO inventes." };
      if (typeof args.total_value !== "number" || !(args.total_value > 0)) {
        return { error: "Valor em falta", _instruction: "Pede o valor total da proposta (um número maior que zero) antes de a criar. NÃO inventes valores." };
      }
      // Confirm the lead exists in this org before linking (proposals.lead_id is NOT NULL + FK).
      const { data: lead } = await ctx.supabaseAdmin
        .from("leads")
        .select("id, name")
        .eq("organization_id", ctx.orgId)
        .eq("id", args.lead_id)
        .maybeSingle();
      if (!lead) return { error: "Lead não encontrada", _instruction: "A lead indicada não existe nesta organização. Usa search_leads para confirmar. NÃO inventes." };
      const { data, error } = await ctx.supabaseAdmin
        .from("proposals")
        .insert({
          organization_id: ctx.orgId,
          lead_id: args.lead_id,
          total_value: args.total_value,
          status: "draft",
          notes: args.notes || null,
          created_by: ctx.userId || null,
        })
        .select("id, total_value")
        .single();
      if (error) {
        return { error: error.message, _instruction: "ERRO ao criar a proposta. Informa o utilizador que houve um problema técnico. NÃO digas que foi criada." };
      }
      return {
        success: true,
        proposal_id: data.id,
        _instruction: `Proposta de **${data.total_value}€** para **${lead.name}** criada com sucesso. Informa o utilizador e oferece um link. [link:Ver Propostas|/proposals]`,
      };
    },
  },
];
