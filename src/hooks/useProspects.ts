import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { hasPerfect2GetherAccess } from "@/lib/perfect2gether";
import {
  buildProspectPayload,
  createEmptyImportResult,
  isDuplicateConflictError,
  mapProspectsError,
  normalizeEmail,
  normalizeIdentifierValue,
  PROSPECTS_ACCESS_ERROR,
  stringify,
} from "@/lib/prospects/import";
import { toast } from "sonner";
import type { Prospect, ProspectImportResult, ProspectSalesperson } from "@/types/prospects";

export function useProspects() {
  const { organization, organizations, isSuperAdmin } = useAuth();
  const hasAccess = hasPerfect2GetherAccess({
    organizationId: organization?.id,
    memberships: organizations,
    isSuperAdmin,
  });

  return useQuery({
    queryKey: ["prospects", organization?.id],
    queryFn: async () => {
      if (!organization?.id || !hasAccess) return [] as Prospect[];

      const client = supabase as any;
      const { data, error } = await client
        .from("prospects")
        .select("*")
        .eq("organization_id", organization.id)
        .order("imported_at", { ascending: false });

      if (error) throw new Error(mapProspectsError(error));
      return (data || []) as Prospect[];
    },
    enabled: !!organization?.id && hasAccess,
  });
}

export function useProspectSalespeople() {
  const { organization, organizations, isSuperAdmin } = useAuth();
  const hasAccess = hasPerfect2GetherAccess({
    organizationId: organization?.id,
    memberships: organizations,
    isSuperAdmin,
  });

  return useQuery({
    queryKey: ["prospect-salespeople", organization?.id],
    queryFn: async () => {
      if (!organization?.id || !hasAccess) return [] as ProspectSalesperson[];

      const { data, error } = await (supabase as any).rpc("get_org_salespeople", {
        p_org_id: organization.id,
      });

      if (error) throw new Error(mapProspectsError(error));
      return (data || []) as ProspectSalesperson[];
    },
    enabled: !!organization?.id && hasAccess,
  });
}

export function useImportProspects() {
  const { organization, organizations, isSuperAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const hasAccess = hasPerfect2GetherAccess({
    organizationId: organization?.id,
    memberships: organizations,
    isSuperAdmin,
  });

  return useMutation({
    mutationFn: async ({
      fileName,
      rows,
    }: {
      fileName: string;
      rows: Record<string, unknown>[];
    }): Promise<ProspectImportResult> => {
      if (!organization?.id) throw new Error("Sem organização ativa.");
      if (!hasAccess) throw new Error(PROSPECTS_ACCESS_ERROR);

      const client = supabase as any;
      const { data: existingRows, error: existingError } = await client
        .from("prospects")
        .select("nif, cpe, email")
        .eq("organization_id", organization.id);

      if (existingError) throw new Error(mapProspectsError(existingError));

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
        if (error) throw new Error(mapProspectsError(error));
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
      toast.error(mapProspectsError(error));
    },
  });
}

export function useDistributeProspects() {
  const { organization, organizations, isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const hasAccess = hasPerfect2GetherAccess({
    organizationId: organization?.id,
    memberships: organizations,
    isSuperAdmin,
  });

  return useMutation({
    mutationFn: async ({ quantity }: { quantity: number }) => {
      if (!organization?.id) throw new Error("Sem organização ativa.");
      if (!hasAccess) throw new Error(PROSPECTS_ACCESS_ERROR);

      const { data, error } = await (supabase as any).rpc("distribute_prospects_round_robin", {
        p_organization_id: organization.id,
        p_quantity: quantity,
      });

      if (error) throw new Error(mapProspectsError(error));

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
      toast.error(mapProspectsError(error));
    },
  });
}
