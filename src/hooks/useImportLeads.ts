import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ImportLeadsResult {
  inserted: number;
  updated: number;
  failed: number;
  firstError: string | null;
  importCode: string;
}

interface ImportLeadsParams {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
  assigneeIds: string[];
  stageKey: string;
  fileName?: string;
}

const trim = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

const parseNumber = (v: unknown): number | null => {
  const s = trim(v);
  if (!s) return null;
  const cleaned = s.includes(",") && s.includes(".")
    ? s.replace(/\./g, "").replace(/,/g, ".")
    : s.replace(/,/g, ".");
  const n = Number(cleaned.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
};

function generateImportCode(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `IMP-${date}-${random}`;
}

export function useImportLeads() {
  const { organization, session } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rows, mapping, assigneeIds, stageKey, fileName }: ImportLeadsParams): Promise<ImportLeadsResult> => {
      if (!organization?.id) throw new Error("Sem organização");
      if (!mapping.name) throw new Error("Mapeamento do campo Nome é obrigatório");

      const pool = assigneeIds.filter(Boolean);
      if (pool.length === 0) throw new Error("Nenhum responsável selecionado");

      const importCode = generateImportCode();

      // Tentar criar registo de importação — opcional, não bloqueia se tabela não existir
      let importId: string | null = null;
      try {
        const { data: importRecord, error: importError } = await (supabase as any)
          .from("lead_imports")
          .insert({
            organization_id: organization.id,
            imported_by: session?.user.id,
            import_code: importCode,
            file_name: fileName ?? null,
            stage_key: stageKey,
            assignee_ids: pool,
          })
          .select("id")
          .single();

        if (!importError && importRecord) {
          importId = importRecord.id;
        }
      } catch {
        // Tabela pode não existir ainda — continua sem tracking
      }

      const get = (row: Record<string, string>, key: string) => {
        const col = mapping[key];
        if (!col) return "";
        return trim(row[col]);
      };

      // Build payloads
      const payloads: Array<Record<string, unknown>> = [];
      rows.forEach((row, i) => {
        const name = get(row, "name");
        if (!name) return;
        const value = parseNumber(get(row, "value"));
        const assignedTo = pool[i % pool.length];

        const payload: Record<string, unknown> = {
          organization_id: organization.id,
          assigned_to: assignedTo,
          status: stageKey,
          name,
          email: get(row, "email") || "",
          phone: get(row, "phone") || "",
          company_name: get(row, "company_name") || null,
          company_nif: get(row, "company_nif") || null,
          source: get(row, "source") || "Importação",
          notes: get(row, "notes") || null,
          value: value ?? undefined,
          gdpr_consent: true,
          automation_enabled: false,
        };

        // Só inclui import_id se a tabela existiu e o registo foi criado
        if (importId) payload.import_id = importId;

        payloads.push(payload);
      });

      // De-duplicate the file by real email (last occurrence wins) so the same
      // person is never imported twice in one go. Empty / placeholder emails
      // cannot be matched, so those rows are all kept.
      const emailIndex = new Map<string, number>();
      const dedupedPayloads: Array<Record<string, unknown>> = [];
      for (const payload of payloads) {
        const email = String(payload.email ?? "").trim().toLowerCase();
        const isRealEmail = email !== "" && !email.endsWith("@placeholder.local");
        if (isRealEmail) {
          const existingIdx = emailIndex.get(email);
          if (existingIdx !== undefined) {
            dedupedPayloads[existingIdx] = payload;
            continue;
          }
          emailIndex.set(email, dedupedPayloads.length);
        }
        dedupedPayloads.push(payload);
      }

      if (dedupedPayloads.length === 0) {
        if (importId) {
          await (supabase as any).from("lead_imports").update({
            total_inserted: 0,
            total_failed: rows.length,
            first_error: "Nenhuma linha com nome válido",
          }).eq("id", importId);
        }
        return { inserted: 0, updated: 0, failed: rows.length, firstError: "Nenhuma linha com nome válido", importCode };
      }

      // Send to the import_leads_bulk RPC in chunks. The RPC UPSERTs: a row
      // whose email already exists updates that lead instead of duplicating it.
      // Per-row side-effect triggers stay off, so large imports stay fast.
      const chunkSize = 200;
      let inserted = 0;
      let updated = 0;
      let failed = 0;
      let firstError: string | null = null;

      for (let i = 0; i < dedupedPayloads.length; i += chunkSize) {
        const chunk = dedupedPayloads.slice(i, i + chunkSize);
        const { data, error } = await (supabase as any).rpc("import_leads_bulk", {
          p_leads: chunk,
        });
        if (error) {
          failed += chunk.length;
          if (!firstError) firstError = error.message;
        } else {
          inserted += Number(data?.inserted ?? 0);
          updated += Number(data?.updated ?? 0);
        }
      }

      // Actualizar registo de importação com totais finais
      if (importId) {
        await (supabase as any).from("lead_imports").update({
          total_inserted: inserted + updated,
          total_failed: failed,
          first_error: firstError,
        }).eq("id", importId);
      }

      return { inserted, updated, failed, firstError, importCode };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({
        title: `Importação concluída · ${result.importCode}`,
        description: `${result.inserted} criados${result.updated ? `, ${result.updated} atualizados` : ""}${result.failed ? `, ${result.failed} falhados` : ""}. Guarda o código para referência futura.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao importar",
        description: error?.message || "Não foi possível importar os leads.",
        variant: "destructive",
      });
    },
  });
}
