import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { getConfig, evolutionFetch } from "../_shared/multicanal.ts";

// Motor dos fluxos de automação.
//
// Três entradas, todas para o mesmo interpretador de grafo:
//   enroll — um gatilho disparou; inscreve o contacto e corre até parar
//   tick   — o cron acorda percursos cuja espera terminou
//   reply  — chegou uma mensagem do contacto; retoma quem estava à espera dela
//            (é isto que torna o modelo conversacional possível)
//
// Regras que o motor garante:
//   * Um percurso avança até bater numa espera, num fim, ou no limite de passos.
//   * Cada nó executa no máximo uma vez por percurso (índice único em
//     automation_run_steps), por isso uma reentrega não duplica mensagens.
//   * Cada passo deixa registo, incluindo o motivo de cada salto. Sem isto,
//     "porque é que este cliente recebeu esta mensagem?" não tem resposta.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-automation-secret",
};

const log = (s: string, d?: unknown) =>
  console.log(`[AUTOMATION-ENGINE] ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);
const logError = (s: string, d?: unknown) =>
  console.error(`[AUTOMATION-ENGINE] ERROR ${s}${d ? ` - ${JSON.stringify(d)}` : ""}`);

// ---------------------------------------------------------------------------
// Tipos do grafo
// ---------------------------------------------------------------------------
interface FlowNode {
  id: string;
  type: string;
  config: Record<string, unknown>;
}
interface FlowEdge {
  id: string;
  source: string;
  target: string;
  branch?: string | null;
}
interface Graph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}
interface Run {
  id: string;
  organization_id: string;
  flow_id: string;
  subject_type: string;
  subject_id: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_phone_key: string | null;
  status: string;
  current_node_id: string | null;
  context: Record<string, unknown>;
  steps_taken: number;
}
interface Flow {
  id: string;
  organization_id: string;
  name: string;
  status: string;
  graph: Graph;
  entry_node_id: string | null;
  version: number;
  reentry_policy: string;
  quiet_hours: { start?: string; end?: string } | null;
  max_steps_per_run: number;
}

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

/** Últimos 9 dígitos — tem de coincidir com public.automation_phone_key. */
function phoneKey(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  return digits.length < 9 ? null : digits.slice(-9);
}

/** Formato que a Evolution aceita (mesma regra do send-scheduled-messages). */
function normalizePhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (/^\d{9}$/.test(cleaned)) return "+351" + cleaned;
  if (/^\d{11}$/.test(cleaned)) return "+55" + cleaned;
  return cleaned;
}

/** {{nome}} → valor do contexto. Deixa intacto o que não conhece. */
function render(template: string, vars: Record<string, unknown>): string {
  return String(template ?? "").replace(/\{\{\s*(\w+)\s*\}\}/g, (whole, key) => {
    const v = vars[key];
    return v === undefined || v === null ? whole : String(v);
  });
}

/**
 * Dentro do horário de silêncio? Devolve a hora a que se pode voltar a enviar,
 * ou null se estiver livre. Trabalha em Europe/Lisbon: um envio às 3h da manhã
 * queima um cliente, e o servidor está em UTC.
 */
function quietUntil(quiet: { start?: string; end?: string } | null): Date | null {
  if (!quiet?.start || !quiet?.end) return null;

  const now = new Date();
  const lisbon = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Lisbon" }));
  const offsetMs = now.getTime() - lisbon.getTime();

  const [sh, sm] = quiet.start.split(":").map(Number);
  const [eh, em] = quiet.end.split(":").map(Number);
  const mins = lisbon.getHours() * 60 + lisbon.getMinutes();
  const startM = sh * 60 + (sm || 0);
  const endM = eh * 60 + (em || 0);

  // Uma janela como 21:00→09:00 atravessa a meia-noite.
  const inside = startM > endM ? mins >= startM || mins < endM : mins >= startM && mins < endM;
  if (!inside) return null;

  const resume = new Date(lisbon);
  resume.setHours(eh, em || 0, 0, 0);
  if (startM > endM && mins >= startM) resume.setDate(resume.getDate() + 1);
  return new Date(resume.getTime() + offsetMs);
}

function nextNodeId(graph: Graph, fromId: string, branch?: string | null): string | null {
  const edges = graph.edges.filter((e) => e.source === fromId);
  if (branch !== undefined && branch !== null) {
    const match = edges.find((e) => e.branch === branch);
    if (match) return match.target;
    return null;
  }
  const plain = edges.find((e) => !e.branch) ?? edges[0];
  return plain ? plain.target : null;
}

function durationMs(config: Record<string, unknown>): number {
  const amount = Number(config.amount ?? config.duration ?? 0);
  const unit = String(config.unit ?? "minutes");
  const per: Record<string, number> = {
    minutes: 60_000, hours: 3_600_000, days: 86_400_000, weeks: 604_800_000,
  };
  return Math.max(0, amount) * (per[unit] ?? 60_000);
}

// ---------------------------------------------------------------------------
// Motor
// ---------------------------------------------------------------------------
class Engine {
  // deno-lint-ignore no-explicit-any
  constructor(private db: any) {}

  /** Canal de WhatsApp ligado da organização, ou null. */
  private async whatsappInstance(orgId: string): Promise<string | null> {
    const { data } = await this.db
      .from("messaging_channels")
      .select("evolution_instance")
      .eq("organization_id", orgId)
      .eq("channel_type", "whatsapp")
      .eq("status", "connected")
      .not("evolution_instance", "is", null)
      .limit(1)
      .maybeSingle();
    return data?.evolution_instance ?? null;
  }

  /**
   * Envia texto (e opcionalmente um anexo) pelo canal da organização.
   * Devolve null em sucesso, ou a mensagem de erro.
   */
  private async sendWhatsappText(
    run: Run,
    text: string,
    media?: { url: string; mimetype?: string; filename?: string; kind?: string } | null,
  ): Promise<string | null> {
    const instance = await this.whatsappInstance(run.organization_id);
    if (!instance) return "Nenhum canal de WhatsApp ligado nesta organização";
    const number = normalizePhone(run.contact_phone!);

    try {
      let res: Response;
      if (media?.url) {
        const kind = media.kind
          ?? (media.mimetype?.startsWith("image/") ? "image"
            : media.mimetype?.startsWith("video/") ? "video" : "document");
        res = await evolutionFetch(getConfig(), `/message/sendMedia/${instance}`, "POST", {
          number,
          mediatype: kind,
          mimetype: media.mimetype || "application/octet-stream",
          media: media.url,
          fileName: media.filename || "anexo",
          ...(text.trim() ? { caption: text } : {}),
        });
      } else {
        res = await evolutionFetch(getConfig(), `/message/sendText/${instance}`, "POST", {
          number, text,
        });
      }
      if (!res.ok) {
        const body = (await res.text()).slice(0, 240);
        return `Evolution ${res.status}: ${body}`;
      }
      return null;
    } catch (e) {
      return `Envio falhou: ${(e as Error).message}`;
    }
  }

  private async recordStep(
    run: Run, node: FlowNode, status: string, detail: Record<string, unknown>
  ): Promise<boolean> {
    const { error } = await this.db.from("automation_run_steps").insert({
      run_id: run.id,
      organization_id: run.organization_id,
      node_id: node.id,
      node_type: node.type,
      status,
      detail,
    });
    if (error) {
      // 23505 = este nó já correu neste percurso. É o índice único a impedir
      // uma reentrega de enviar a mensagem outra vez.
      if ((error as { code?: string }).code === "23505") {
        log("nó já executado neste percurso — a ignorar", { run: run.id, node: node.id });
        return false;
      }
      logError("falha a registar passo", { error: error.message, run: run.id, node: node.id });
    }
    return true;
  }

  private async finish(run: Run, status: string, error?: string) {
    await this.db.from("automation_runs").update({
      status,
      last_error: error ?? null,
      completed_at: new Date().toISOString(),
      current_node_id: null,
      wake_at: null,
    }).eq("id", run.id);
  }

  private async park(run: Run, nodeId: string, status: string, wakeAt: Date | null) {
    await this.db.from("automation_runs").update({
      status,
      current_node_id: nodeId,
      wake_at: wakeAt ? wakeAt.toISOString() : null,
    }).eq("id", run.id);
  }

  /** Percorre o grafo a partir do nó atual até parar. */
  async advance(run: Run, flow: Flow, startNodeId: string | null) {
    const graph = flow.graph ?? { nodes: [], edges: [] };
    const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
    let cursor: string | null = startNodeId;
    let steps = run.steps_taken;

    while (cursor) {
      if (steps >= flow.max_steps_per_run) {
        logError("limite de passos atingido — possível ciclo no fluxo", { run: run.id, flow: flow.id });
        await this.finish(run, "failed", `Limite de ${flow.max_steps_per_run} passos atingido`);
        return;
      }

      const node = nodeById.get(cursor);
      if (!node) {
        logError("nó inexistente no grafo", { run: run.id, node: cursor });
        await this.finish(run, "failed", `Nó ${cursor} não existe neste fluxo`);
        return;
      }

      steps++;
      const outcome = await this.execute(run, flow, node);

      if (outcome.kind === "park") {
        if (outcome.resumeSelf) {
          // Ainda não executou nada — não regista passo (a re-execução vai
          // registá-lo) e deixa a marca para o tick voltar a ESTE nó.
          const context = { ...run.context, __resume_node: node.id };
          await this.db.from("automation_runs").update({ context }).eq("id", run.id);
        } else {
          await this.recordStep(run, node, "waiting", outcome.detail ?? {});
        }
        await this.park(run, node.id, outcome.status!, outcome.wakeAt ?? null);
        await this.db.from("automation_runs").update({ steps_taken: steps }).eq("id", run.id);
        return;
      }

      const fresh = await this.recordStep(run, node, outcome.kind === "fail" ? "failed" : "ok", outcome.detail ?? {});
      if (!fresh && outcome.kind !== "fail") {
        // Já tinha corrido: segue em frente sem repetir o efeito.
        cursor = nextNodeId(graph, node.id, outcome.branch);
        continue;
      }

      if (outcome.kind === "fail") {
        await this.finish(run, "failed", outcome.error);
        return;
      }
      if (outcome.kind === "end") {
        await this.db.from("automation_runs").update({ steps_taken: steps }).eq("id", run.id);
        await this.finish(run, "completed");
        return;
      }

      cursor = nextNodeId(graph, node.id, outcome.branch);
      run.context = outcome.context ?? run.context;
      if (outcome.context) {
        await this.db.from("automation_runs").update({ context: outcome.context }).eq("id", run.id);
      }
    }

    await this.db.from("automation_runs").update({ steps_taken: steps }).eq("id", run.id);
    await this.finish(run, "completed");
  }

  /** Executa um nó. Não decide o próximo — só diz o que aconteceu. */
  private async execute(run: Run, flow: Flow, node: FlowNode): Promise<{
    kind: "next" | "park" | "end" | "fail";
    branch?: string | null;
    status?: string;
    wakeAt?: Date | null;
    detail?: Record<string, unknown>;
    context?: Record<string, unknown>;
    error?: string;
    /**
     * Park ANTES de executar o efeito (adiamento por horário de silêncio): não
     * regista passo e marca o percurso para RE-EXECUTAR este nó ao acordar.
     * Sem isto, o tick seguia para o nó seguinte e a mensagem adiada nunca
     * chegava a ser enviada.
     */
    resumeSelf?: boolean;
  }> {
    const cfg = node.config ?? {};
    const vars = { ...run.context, nome: run.contact_name, email: run.contact_email, telefone: run.contact_phone };

    switch (node.type) {
      // O gatilho é apenas o ponto de entrada.
      case "trigger":
      case "lead_created":
      case "lead_status_changed":
      case "form_submitted":
      case "whatsapp_keyword":
      case "sale_status_changed":
      case "list_joined":
        return { kind: "next", detail: { entrada: node.type } };

      case "wait": {
        const quiet = quietUntil(flow.quiet_hours);
        const base = Date.now() + durationMs(cfg);
        const wake = quiet && quiet.getTime() > base ? quiet : new Date(base);
        return {
          kind: "park", status: "waiting", wakeAt: wake,
          detail: { espera_ate: wake.toISOString(), adiado_por_silencio: !!(quiet && quiet.getTime() > base) },
        };
      }

      case "wait_reply": {
        // O nó conversacional: pergunta (opcionalmente com botões) e fica à
        // espera do que a pessoa responder.
        if (!run.contact_phone_key || !run.contact_phone) {
          return { kind: "fail", error: "Contacto sem telefone — não é possível esperar resposta" };
        }

        const rules = (cfg.rules ?? []) as Array<{ id: string; keywords?: string[]; label?: string }>;
        const question = cfg.question ? render(String(cfg.question), vars) : "";
        let buttonsSent = false;

        if (question) {
          const quiet = quietUntil(flow.quiet_hours);
          if (quiet) {
            return {
              kind: "park", status: "waiting", wakeAt: quiet, resumeSelf: true,
              detail: { adiado_por_horario_de_silencio_ate: quiet.toISOString() },
            };
          }

          const instance = await this.whatsappInstance(run.organization_id);
          if (!instance) return { kind: "fail", error: "Nenhum canal de WhatsApp ligado nesta organização" };
          const number = normalizePhone(run.contact_phone);

          // Botões interativos primeiro; o WhatsApp não-oficial nem sempre os
          // entrega, por isso qualquer falha degrada para opções numeradas —
          // e a resposta por número também é aceite no handleReply.
          if (cfg.use_buttons && rules.length) {
            try {
              const res = await evolutionFetch(getConfig(), `/message/sendButtons/${instance}`, "POST", {
                number,
                title: "",
                description: question,
                footer: "",
                buttons: rules.map((r) => ({
                  type: "reply",
                  displayText: (r.label ?? r.keywords?.[0] ?? "Opção").slice(0, 20),
                  id: r.id,
                })),
              });
              buttonsSent = res.ok;
              if (!res.ok) log("sendButtons falhou — a degradar para texto", { status: res.status });
            } catch (e) {
              log("sendButtons indisponível — a degradar para texto", { error: (e as Error).message });
            }
          }

          if (!buttonsSent) {
            const options = cfg.use_buttons && rules.length
              ? "\n\n" + rules.map((r, i) => `${i + 1}️⃣ ${r.label ?? r.keywords?.[0] ?? ""}`).join("\n")
              : "";
            const sendErr = await this.sendWhatsappText(run, `${question}${options}`);
            if (sendErr) return { kind: "fail", error: sendErr };
          }
        }

        const timeoutMs = durationMs({ amount: cfg.timeout_amount ?? 24, unit: cfg.timeout_unit ?? "hours" });
        const wake = new Date(Date.now() + timeoutMs);
        return {
          kind: "park", status: "awaiting_reply", wakeAt: wake,
          detail: {
            espera_resposta_ate: wake.toISOString(),
            regras: rules.length,
            pergunta_enviada: !!question,
            botoes: buttonsSent,
          },
        };
      }

      case "send_whatsapp": {
        if (!run.contact_phone) return { kind: "fail", error: "Contacto sem telefone" };

        const quiet = quietUntil(flow.quiet_hours);
        if (quiet) {
          return {
            kind: "park", status: "waiting", wakeAt: quiet, resumeSelf: true,
            detail: { adiado_por_horario_de_silencio_ate: quiet.toISOString() },
          };
        }

        const text = render(String(cfg.message ?? ""), vars);
        const media = (cfg.media ?? null) as
          | { url?: string; mimetype?: string; filename?: string; kind?: string }
          | null;
        const mediaUrl = media?.url ?? (cfg.media_url ? String(cfg.media_url) : null);
        if (!text.trim() && !mediaUrl) return { kind: "fail", error: "Mensagem vazia" };

        const sendErr = await this.sendWhatsappText(run, text, mediaUrl ? {
          url: mediaUrl,
          mimetype: media?.mimetype,
          filename: media?.filename,
          kind: media?.kind,
        } : null);
        if (sendErr) return { kind: "fail", error: sendErr };

        return {
          kind: "next",
          detail: { canal: "whatsapp", para: run.contact_phone, texto: text.slice(0, 300), ...(mediaUrl ? { anexo: media?.filename ?? mediaUrl } : {}) },
        };
      }

      case "send_email": {
        if (!run.contact_email) return { kind: "fail", error: "Contacto sem email" };
        const { error } = await this.db.functions.invoke("send-template-email", {
          body: {
            organizationId: run.organization_id,
            templateId: cfg.template_id ?? undefined,
            subject: cfg.subject ? render(String(cfg.subject), vars) : undefined,
            htmlContent: cfg.html ? render(String(cfg.html), vars) : undefined,
            recipients: [{
              email: run.contact_email,
              name: run.contact_name ?? run.contact_email,
              clientId: run.subject_type === "client" ? run.subject_id : undefined,
              variables: vars,
            }],
          },
        });
        if (error) return { kind: "fail", error: `Email falhou: ${error.message}` };
        return { kind: "next", detail: { canal: "email", para: run.contact_email, template: cfg.template_id ?? null } };
      }

      case "condition": {
        const field = String(cfg.field ?? "");
        const op = String(cfg.operator ?? "equals");
        const expected = cfg.value;
        const actual = (vars as Record<string, unknown>)[field];

        let yes = false;
        switch (op) {
          case "exists":       yes = actual !== undefined && actual !== null && actual !== ""; break;
          case "not_exists":   yes = actual === undefined || actual === null || actual === ""; break;
          case "contains":     yes = String(actual ?? "").toLowerCase().includes(String(expected ?? "").toLowerCase()); break;
          case "not_equals":   yes = String(actual ?? "") !== String(expected ?? ""); break;
          case "greater_than": yes = Number(actual) > Number(expected); break;
          case "less_than":    yes = Number(actual) < Number(expected); break;
          default:             yes = String(actual ?? "").toLowerCase() === String(expected ?? "").toLowerCase();
        }
        return { kind: "next", branch: yes ? "yes" : "no", detail: { campo: field, operador: op, resultado: yes } };
      }

      case "move_stage": {
        if (run.subject_type !== "lead" || !run.subject_id) {
          return { kind: "next", detail: { ignorado: "só se aplica a leads" } };
        }
        const { error } = await this.db.from("leads")
          .update({ status: cfg.stage })
          .eq("id", run.subject_id)
          .eq("organization_id", run.organization_id);
        if (error) return { kind: "fail", error: `Mover etapa falhou: ${error.message}` };
        return { kind: "next", detail: { nova_etapa: cfg.stage } };
      }

      case "assign_user": {
        if (!run.subject_id) return { kind: "next", detail: { ignorado: "sem sujeito" } };
        const table = run.subject_type === "client" ? "crm_clients" : "leads";
        const { error } = await this.db.from(table)
          .update({ assigned_to: cfg.user_id })
          .eq("id", run.subject_id)
          .eq("organization_id", run.organization_id);
        if (error) return { kind: "fail", error: `Atribuição falhou: ${error.message}` };
        return { kind: "next", detail: { atribuido_a: cfg.user_id } };
      }

      case "add_to_list": {
        if (!run.contact_email) return { kind: "next", detail: { ignorado: "contacto sem email" } };
        const { data: contact } = await this.db.from("marketing_contacts").upsert(
          {
            organization_id: run.organization_id,
            email: run.contact_email,
            name: run.contact_name ?? run.contact_email,
            source: "automation",
            subscribed: true,
          },
          { onConflict: "organization_id,email" },
        ).select("id").single();

        if (contact?.id && cfg.list_id) {
          await this.db.from("marketing_list_members").upsert(
            { list_id: cfg.list_id, contact_id: contact.id },
            { onConflict: "list_id,contact_id" },
          );
        }
        return { kind: "next", detail: { lista: cfg.list_id } };
      }

      case "create_task": {
        const title = render(String(cfg.title ?? ""), vars).trim();
        if (!title) return { kind: "fail", error: "Tarefa sem título" };

        const dueDays = Number(cfg.due_in_days ?? 1);
        const dueAt = new Date(Date.now() + Math.max(0, dueDays) * 86_400_000).toISOString();

        const base = {
          organization_id: run.organization_id,
          title,
          description: cfg.description ? render(String(cfg.description), vars) : null,
          due_at: dueAt,
          contact_name: run.contact_name,
          // phone_key é coluna gerada a partir de contact_phone — escrever nela
          // é rejeitado pelo Postgres.
          contact_phone: run.contact_phone,
          assigned_to: (cfg.user_id as string) ?? null,
        };

        const { error } = await this.db.from("inbox_tasks").insert({
          ...base,
          lead_id: run.subject_type === "lead" ? run.subject_id : null,
          client_id: run.subject_type === "client" ? run.subject_id : null,
        });

        if (error) {
          // 23503 = a lead/cliente de origem foi apagada entretanto. A tarefa
          // continua a ser útil (tem nome e telefone) — vale mais criá-la sem a
          // ligação do que deitar o percurso inteiro fora.
          if ((error as { code?: string }).code === "23503") {
            const { error: retryErr } = await this.db.from("inbox_tasks").insert(base);
            if (retryErr) return { kind: "fail", error: `Criar tarefa falhou: ${retryErr.message}` };
            return { kind: "next", detail: { tarefa: title, prazo: dueAt, sem_ligacao: "origem apagada" } };
          }
          return { kind: "fail", error: `Criar tarefa falhou: ${error.message}` };
        }
        return { kind: "next", detail: { tarefa: title, prazo: dueAt } };
      }

      case "webhook": {
        const url = String(cfg.url ?? "");
        if (!url) return { kind: "fail", error: "Webhook sem URL" };
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ run_id: run.id, flow_id: flow.id, contact: vars }),
          });
          return { kind: "next", detail: { url, status: res.status } };
        } catch (e) {
          return { kind: "fail", error: `Webhook falhou: ${(e as Error).message}` };
        }
      }

      case "end":
        return { kind: "end", detail: { motivo: cfg.reason ?? "fim do fluxo" } };

      default:
        logError("tipo de nó desconhecido", { type: node.type, flow: flow.id });
        return { kind: "next", detail: { ignorado: `tipo desconhecido: ${node.type}` } };
    }
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
async function loadFlow(db: any, flowId: string): Promise<Flow | null> {
  const { data } = await db.from("automation_flows").select("*").eq("id", flowId).maybeSingle();
  return data ?? null;
}

// deno-lint-ignore no-explicit-any
async function handleEnroll(db: any, body: Record<string, unknown>) {
  const triggerType = String(body.trigger_type ?? "");
  const orgId = String(body.organization_id ?? "");
  const record = (body.record ?? {}) as Record<string, unknown>;
  if (!triggerType || !orgId) return { error: "trigger_type e organization_id são obrigatórios" };

  const { data: flows } = await db
    .from("automation_flows")
    .select("*")
    .eq("organization_id", orgId)
    .eq("trigger_type", triggerType)
    .eq("status", "active");

  if (!flows?.length) return { enrolled: 0, message: "Nenhum fluxo ativo para este gatilho" };

  const engine = new Engine(db);
  const results: Array<Record<string, unknown>> = [];

  for (const flow of flows as Flow[]) {
    const subjectId = (record.id as string) ?? null;

    // Reinscrição: 'once' impede para sempre; 'after_completion' só permite
    // depois de o anterior ter terminado (o índice único já bloqueia percursos
    // simultâneos, aqui trata-se dos já concluídos).
    if (subjectId && flow.reentry_policy === "once") {
      const { data: prior } = await db.from("automation_runs")
        .select("id").eq("flow_id", flow.id).eq("subject_id", subjectId).limit(1);
      if (prior?.length) { results.push({ flow: flow.id, skipped: "já entrou neste fluxo" }); continue; }
    }

    const phone = (record.phone ?? record.telefone ?? null) as string | null;
    const { data: run, error } = await db.from("automation_runs").insert({
      organization_id: orgId,
      flow_id: flow.id,
      flow_version: flow.version,
      subject_type: String(body.subject_type ?? "lead"),
      subject_id: subjectId,
      contact_name: (record.name ?? record.nome ?? null) as string | null,
      contact_email: (record.email ?? null) as string | null,
      contact_phone: phone,
      contact_phone_key: phoneKey(phone),
      context: { ...record },
      current_node_id: flow.entry_node_id,
    }).select("*").single();

    if (error) {
      // 23505 = já existe um percurso ativo deste contacto neste fluxo.
      if ((error as { code?: string }).code === "23505") {
        results.push({ flow: flow.id, skipped: "já tem um percurso ativo" });
        continue;
      }
      logError("falha a inscrever", { flow: flow.id, error: error.message });
      results.push({ flow: flow.id, error: error.message });
      continue;
    }

    await db.from("automation_flows").update({ last_enrolled_at: new Date().toISOString() }).eq("id", flow.id);
    await engine.advance(run as Run, flow, flow.entry_node_id);
    results.push({ flow: flow.id, run: run.id });
  }

  return { enrolled: results.filter((r) => r.run).length, results };
}

// deno-lint-ignore no-explicit-any
async function handleTick(db: any) {
  const { data: due } = await db
    .from("automation_runs")
    .select("*")
    .in("status", ["waiting", "awaiting_reply"])
    .lte("wake_at", new Date().toISOString())
    .order("wake_at", { ascending: true })
    .limit(100);

  if (!due?.length) return { woken: 0 };

  const engine = new Engine(db);
  let woken = 0, failed = 0;

  for (const run of due as Run[]) {
    // Claim: só avança quem conseguir mudar o estado, para dois ticks em
    // paralelo não executarem o mesmo percurso (o process-automation-queue
    // antigo não faz isto e pode duplicar envios).
    const { data: claimed } = await db.from("automation_runs")
      .update({ status: "running" })
      .eq("id", run.id)
      .in("status", ["waiting", "awaiting_reply"])
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const flow = await loadFlow(db, run.flow_id);
    if (!flow) { await db.from("automation_runs").update({ status: "failed", last_error: "Fluxo apagado" }).eq("id", run.id); failed++; continue; }

    const wasAwaitingReply = run.status === "awaiting_reply";
    const node = (flow.graph?.nodes ?? []).find((n) => n.id === run.current_node_id);

    try {
      if (wasAwaitingReply && node) {
        // Esgotou o tempo de espera: segue pelo ramo "timeout".
        await db.from("automation_run_steps").insert({
          run_id: run.id, organization_id: run.organization_id,
          node_id: node.id, node_type: node.type, status: "ok",
          detail: { ramo: "timeout", motivo: "sem resposta dentro do prazo" },
        });
        const next = nextNodeId(flow.graph, node.id, "timeout");
        if (!next) { await db.from("automation_runs").update({ status: "completed", completed_at: new Date().toISOString(), current_node_id: null, wake_at: null }).eq("id", run.id); woken++; continue; }
        await engine.advance({ ...run, status: "running" }, flow, next);
      } else if (node && (run.context as Record<string, unknown>)?.__resume_node === node.id) {
        // Parou ANTES de executar (adiado pelo horário de silêncio): re-executa
        // o próprio nó, agora fora da janela. Limpa a marca primeiro para não
        // voltar a entrar aqui em ciclo.
        const context = { ...run.context };
        delete (context as Record<string, unknown>).__resume_node;
        await db.from("automation_runs").update({ context }).eq("id", run.id);
        await engine.advance({ ...run, status: "running", context }, flow, node.id);
      } else {
        const next = node ? nextNodeId(flow.graph, node.id) : run.current_node_id;
        await engine.advance({ ...run, status: "running" }, flow, next);
      }
      woken++;
    } catch (e) {
      logError("percurso falhou no tick", { run: run.id, error: (e as Error).message });
      await db.from("automation_runs").update({ status: "failed", last_error: (e as Error).message }).eq("id", run.id);
      failed++;
    }
  }

  if (failed > 0) logError("tick terminou com falhas", { failed });
  return { woken, failed };
}

/**
 * Nenhum percurso à espera desta pessoa — mas a mensagem pode ser a palavra-
 * chave que inicia um fluxo. Procura fluxos com gatilho `whatsapp_keyword`
 * cujas palavras apareçam no texto.
 */
// deno-lint-ignore no-explicit-any
async function handleKeywordStart(
  db: any, orgId: string, key: string, text: string, body: Record<string, unknown>,
) {
  const { data: flows } = await db
    .from("automation_flows")
    .select("*")
    .eq("organization_id", orgId)
    .eq("trigger_type", "whatsapp_keyword")
    .eq("status", "active");

  if (!flows?.length) return { resumed: 0, started: 0 };

  const lower = text.toLowerCase();
  const engine = new Engine(db);
  let started = 0;

  for (const flow of flows as Flow[]) {
    const keywords = ((flow as unknown as { trigger_config?: { keywords?: string[] } })
      .trigger_config?.keywords ?? []) as string[];
    // Sem palavras configuradas o fluxo responderia a QUALQUER mensagem — o que
    // seria um disparo em massa acidental. Exige configuração explícita.
    if (!keywords.length) continue;
    if (!keywords.some((k) => lower.includes(String(k).toLowerCase()))) continue;

    const phone = String(body.phone ?? "");
    const { data: run, error } = await db.from("automation_runs").insert({
      organization_id: orgId,
      flow_id: flow.id,
      flow_version: flow.version,
      subject_type: "contact",
      subject_id: null,
      contact_name: (body.name ?? null) as string | null,
      contact_phone: phone,
      contact_phone_key: key,
      context: { telefone: phone, mensagem_inicial: text },
      current_node_id: flow.entry_node_id,
    }).select("*").single();

    if (error) {
      logError("falha a iniciar fluxo por palavra-chave", { flow: flow.id, error: error.message });
      continue;
    }

    await engine.advance(run as Run, flow, flow.entry_node_id);
    started++;
  }

  return { resumed: 0, started };
}

/** Chegou uma mensagem do contacto: retoma quem estava à espera dela. */
// deno-lint-ignore no-explicit-any
async function handleReply(db: any, body: Record<string, unknown>) {
  const orgId = String(body.organization_id ?? "");
  const key = phoneKey(String(body.phone ?? ""));
  const text = String(body.text ?? "").trim();
  if (!orgId || !key) return { resumed: 0, message: "organization_id e phone são obrigatórios" };

  const { data: runs } = await db
    .from("automation_runs")
    .select("*")
    .eq("organization_id", orgId)
    .eq("contact_phone_key", key)
    .eq("status", "awaiting_reply")
    .limit(10);

  // Ninguém estava à espera desta pessoa: a mensagem pode, ainda assim, ser a
  // palavra-chave que ARRANCA um fluxo ("escreva PROMO para receber…"). É o
  // outro metade do modelo conversacional.
  if (!runs?.length) return await handleKeywordStart(db, orgId, key, text, body);

  const engine = new Engine(db);
  let resumed = 0;

  for (const run of runs as Run[]) {
    const { data: claimed } = await db.from("automation_runs")
      .update({ status: "running" })
      .eq("id", run.id)
      .eq("status", "awaiting_reply")
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    const flow = await loadFlow(db, run.flow_id);
    const node = flow?.graph?.nodes?.find((n) => n.id === run.current_node_id);
    if (!flow || !node) {
      await db.from("automation_runs").update({ status: "failed", last_error: "Fluxo ou nó em falta" }).eq("id", run.id);
      continue;
    }

    // Qual das regras corresponde ao que a pessoa escreveu? Aceita, por regra:
    // palavras-chave no texto, o rótulo do botão tal e qual (clique num botão
    // interativo devolve o displayText), ou o número da opção ("1", "2"…) do
    // modo degradado sem botões.
    const rules = (node.config?.rules ?? []) as Array<{ id: string; keywords?: string[]; label?: string }>;
    const lower = text.toLowerCase();
    const exact = lower.trim();
    const matched = rules.find((r, i) =>
      (r.keywords ?? []).some((k) => lower.includes(String(k).toLowerCase())) ||
      (r.label && exact === r.label.toLowerCase()) ||
      exact === String(i + 1)
    );
    const branch = matched?.id ?? "fallback";

    await db.from("automation_run_steps").insert({
      run_id: run.id, organization_id: run.organization_id,
      node_id: node.id, node_type: node.type, status: "ok",
      detail: { ramo: branch, resposta: text.slice(0, 300), regra: matched?.label ?? "nenhuma correspondência" },
    });

    const context = { ...run.context, ultima_resposta: text };
    await db.from("automation_runs").update({ context }).eq("id", run.id);

    let next = nextNodeId(flow.graph, node.id, branch);
    // Sem ramo específico para esta resposta, tenta o de fallback.
    if (!next && branch !== "fallback") next = nextNodeId(flow.graph, node.id, "fallback");

    if (!next) {
      await db.from("automation_runs").update({
        status: "completed", completed_at: new Date().toISOString(),
        current_node_id: null, wake_at: null,
      }).eq("id", run.id);
      resumed++;
      continue;
    }

    await engine.advance({ ...run, status: "running", context }, flow, next);
    resumed++;
  }

  return { resumed };
}

// ---------------------------------------------------------------------------
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const db = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Interno apenas: envia mensagens reais em nome da organização. Aceita a
  // service-role key (outras edge functions) ou o segredo do Vault (triggers e
  // cron da base de dados), tal como o process-automation.
  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  let authorized = !!bearer && bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authorized) {
    const provided = req.headers.get("x-automation-secret");
    if (provided) {
      const { data } = await db.rpc("verify_automation_secret", { p_secret: provided });
      authorized = data === true;
    }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Não autorizado" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "tick");

    let result: unknown;
    if (action === "enroll")      result = await handleEnroll(db, body);
    else if (action === "reply")  result = await handleReply(db, body);
    else if (action === "tick")   result = await handleTick(db);
    else result = { error: `Ação desconhecida: ${action}` };

    log("concluído", { action, result });
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    logError("erro não tratado", { error: (e as Error).message });
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
