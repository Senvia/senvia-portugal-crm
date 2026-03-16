import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { hasPerfect2GetherAccess } from "@/lib/perfect2gether";
import { toast } from "sonner";
import type { Prospect, ProspectImportResult, ProspectSalesperson } from "@/types/prospects";

const normalizeHeader = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const stringify = (value: unknown) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeEmail = (value: string) => {
  const email = stringify(value).toLowerCase();
  return email.includes("@") ? email : "";
};

const parseNumericValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const input = stringify(value);
  if (!input) return null;

  const sanitized = input.replace(/\s/g, "");
  const normalized = sanitized.includes(",") && sanitized.includes(".")
    ? sanitized.replace(/\./g, "").replace(/,/g, ".")
    : sanitized.replace(/,/g, ".");

  const numeric = Number(normalized.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
};

const findValue = (row: Record<string, unknown>, aliases: string[]) => {
  const aliasSet = new Set(aliases.map(normalizeHeader));

  for (const [key, value] of Object.entries(row)) {
    if (aliasSet.has(normalizeHeader(key))) {
      return value;
    }
  }

  return "";
};

const parseContactField = (value: unknown) => {
  const raw = stringify(value);
  if (!raw) return { phone: null as string | null, contactName: null as string | null };

  const digitCount = raw.replace(/\D/g, "").length;
  if (digitCount >= 8) {
    return { phone: raw, contactName: null };
  }

  return { phone: null, contactName: raw };
};

const buildProspectPayload = ({
  row,
  fileName,
  organizationId,
  userId,
}: {
  row: Record<string, unknown>;
  fileName: string;
  organizationId: string;
  userId?: string;
}) => {
  const companyName = stringify(findValue(row, ["Nome da Empresa", "Empresa", "Company", "Nome"]));
  const email = normalizeEmail(stringify(findValue(row, ["Email", "E-mail", "Mail"])));
  const contactField = findValue(row, ["Contato", "Contacto", "Telefone", "Phone"]);
  const { phone, contactName } = parseContactField(contactField);

  const nif = stringify(findValue(row, ["NIF"]));
  const cpe = stringify(findValue(row, ["CPE"]));
  const segment = stringify(findValue(row, ["Segmento", "Segment"]));
  const status = stringify(findValue(row, ["Estado", "Status"])) || "new";
  const annualConsumption = parseNumericValue(findValue(row, ["kWhAno", "kWh Ano", "Consumo Anual", "kwhano"]));
  const observations = stringify(findValue(row, ["Observações", "Observacoes", "Notas", "Notes"]));

  return {
    organization_id: organizationId,
    company_name: companyName,
    contact_name: contactName,
    email: email || null,
    phone,
    nif: nif || null,
    cpe: cpe || null,
    segment: segment || null,
    status,
    annual_consumption_kwh: annualConsumption,
    observations: observations || null,
    source: "import",
    source_file_name: fileName,
    imported_by: userId || null,
    metadata: {
      numero: stringify(findValue(row, ["Numero", "Número"])) || null,
      nt: stringify(findValue(row, ["NT"])) || null,
      pc: parseNumericValue(findValue(row, ["PC"])),
      com: stringify(findValue(row, ["COM"])) || null,
      gestor_totallink: stringify(findValue(row, ["Gestor Totallink", "Gestor"])) || null,
      raw_row: row,
    },
  };
};

export function useProspects() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["prospects", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [] as Prospect[];

      const client = supabase as any;
      const { data, error } = await client
        .from("prospects")
        .select("*")
        .eq("organization_id", organization.id)
        .order("imported_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Prospect[];
    },
    enabled: !!organization?.id,
  });
}

export function useProspectSalespeople() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ["prospect-salespeople", organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [] as ProspectSalesperson[];

      const { data, error } = await (supabase as any).rpc("get_org_salespeople", {
        p_org_id: organization.id,
      });

      if (error) throw error;
      return (data || []) as ProspectSalesperson[];
    },
    enabled: !!organization?.id,
  });
}

export function useImportProspects() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fileName,
      rows,
    }: {
      fileName: string;
      rows: Record<string, unknown>[];
    }): Promise<ProspectImportResult> => {
      if (!organization?.id) throw new Error("Sem organização ativa.");

      const client = supabase as any;
      const { data: existingRows, error: existingError } = await client
        .from("prospects")
        .select("nif, cpe, email")
        .eq("organization_id", organization.id);

      if (existingError) throw existingError;

      const existingPairKeys = new Set<string>();
      const existingEmailKeys = new Set<string>();

      for (const item of (existingRows || []) as Array<{ nif?: string | null; cpe?: string | null; email?: string | null }>) {
        const nif = stringify(item.nif);
        const cpe = stringify(item.cpe);
        const email = normalizeEmail(stringify(item.email));

        if (nif && cpe) existingPairKeys.add(`${nif}::${cpe}`);
        if (email) existingEmailKeys.add(email);
      }

      const queuedPairKeys = new Set<string>();
      const queuedEmailKeys = new Set<string>();
      const prospectsToInsert: Record<string, unknown>[] = [];
      let skipped = 0;

      for (const row of rows) {
        const payload = buildProspectPayload({
          row,
          fileName,
          organizationId: organization.id,
          userId: user?.id,
        });

        if (!payload.company_name) {
          skipped += 1;
          continue;
        }

        const pairKey = payload.nif && payload.cpe ? `${payload.nif}::${payload.cpe}` : null;
        const emailKey = payload.email ? normalizeEmail(payload.email) : null;

        const isDuplicate =
          (pairKey && (existingPairKeys.has(pairKey) || queuedPairKeys.has(pairKey))) ||
          (emailKey && (existingEmailKeys.has(emailKey) || queuedEmailKeys.has(emailKey)));

        if (isDuplicate) {
          skipped += 1;
          continue;
        }

        if (pairKey) queuedPairKeys.add(pairKey);
        if (emailKey) queuedEmailKeys.add(emailKey);
        prospectsToInsert.push(payload);
      }

      for (let index = 0; index < prospectsToInsert.length; index += 200) {
        const chunk = prospectsToInsert.slice(index, index + 200);
        const { error } = await client.from("prospects").insert(chunk);
        if (error) throw error;
      }

      return {
        inserted: prospectsToInsert.length,
        skipped,
      };
    },
    onSuccess: ({ inserted, skipped }) => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success(`${inserted} prospects importados${skipped ? ` • ${skipped} ignorados` : ""}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao importar prospects");
    },
  });
}

export function useDistributeProspects() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quantity }: { quantity: number }) => {
      if (!organization?.id) throw new Error("Sem organização ativa.");

      const { data, error } = await (supabase as any).rpc("distribute_prospects_round_robin", {
        p_organization_id: organization.id,
        p_quantity: quantity,
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      return {
        distributedCount: result?.distributed_count || 0,
        createdLeadsCount: result?.created_leads_count || 0,
      };
    },
    onSuccess: ({ distributedCount, createdLeadsCount }) => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success(`${distributedCount} prospects distribuídos • ${createdLeadsCount} leads criadas`);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao distribuir prospects");
    },
  });
}
