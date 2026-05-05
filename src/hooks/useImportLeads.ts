import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ImportLeadsResult {
  inserted: number;
  failed: number;
  firstError: string | null;
}

interface ImportLeadsParams {
  rows: Record<string, string>[];
  mapping: Record<string, string>;
  assigneeIds: string[]; // round-robin pool (length 1 = single assignee)
  stageKey: string;
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

export function useImportLeads() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ rows, mapping, assigneeIds, stageKey }: ImportLeadsParams): Promise<ImportLeadsResult> => {
      if (!organization?.id) throw new Error("Sem organização");
      if (!mapping.name) throw new Error("Mapeamento do campo Nome é obrigatório");

      const pool = assigneeIds.filter(Boolean);
      if (pool.length === 0) throw new Error("Nenhum responsável selecionado");

      const get = (row: Record<string, string>, key: string) => {
        const col = mapping[key];
        if (!col) return "";
        return trim(row[col]);
      };

      // Build payloads
      const payloads: Array<Record<string, unknown>> = [];
      rows.forEach((row, i) => {
        const name = get(row, "name");
        if (!name) return; // skip rows with no name
        const value = parseNumber(get(row, "value"));
        const assignedTo = pool[i % pool.length];

        payloads.push({
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
          automation_enabled: false, // silent import
        });
      });

      if (payloads.length === 0) {
        return { inserted: 0, failed: rows.length, firstError: "Nenhuma linha com nome válido" };
      }

      // Insert in chunks
      const chunkSize = 100;
      let inserted = 0;
      let failed = 0;
      let firstError: string | null = null;

      for (let i = 0; i < payloads.length; i += chunkSize) {
        const chunk = payloads.slice(i, i + chunkSize);
        const { data, error } = await supabase.from("leads").insert(chunk as any).select("id");
        if (error) {
          failed += chunk.length;
          if (!firstError) firstError = error.message;
        } else {
          inserted += data?.length ?? chunk.length;
        }
      }

      return { inserted, failed, firstError };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast({
        title: "Importação concluída",
        description: `${result.inserted} leads criados${result.failed ? `, ${result.failed} falhados` : ""}.`,
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
