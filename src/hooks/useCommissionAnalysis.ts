import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveCommissions, type CpeDetail } from "@/hooks/useLiveCommissions";
import { useTeamMembers } from "@/hooks/useTeam";

interface ChargebackImportRecord {
  id: string;
  created_at: string;
  file_name: string;
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  chargeback_count: number;
  total_chargeback_amount: number;
}

interface ChargebackItemRecord {
  id: string;
  import_id: string;
  matched_user_id: string | null;
  chargeback_amount: number;
  matched: boolean;
  cpe: string;
  unmatched_reason: string | null;
  raw_row: Record<string, unknown> | null;
}

interface ChargebackDataset {
  imports: ChargebackImportRecord[];
  items: ChargebackItemRecord[];
}

export interface FileDataRow {
  tipoComissao: string;
  nomeEmpresa: string;
  tipo: string;
  cpe: string;
  consumoAnual: string;
  duracaoContrato: string;
  dataInicio: string;
  dataFim: string;
  dbl: string;
  valorReceber: string;
}

export interface CommissionAnalysisCommercial {
  userId: string;
  name: string;
  commissionAmount: number;
  commissionBaseCount: number;
  chargebackAmount: number;
  chargebackCount: number;
  differentialAmount: number;
  differentialCount: number;
  cpes: CpeDetail[];
  fileData: FileDataRow[];
}

export interface CommissionAnalysisSummary {
  totalCommissionAmount: number;
  totalCommissionBaseCount: number;
  totalChargebackAmount: number;
  totalChargebackCount: number;
  totalDifferentialAmount: number;
  totalDifferentialCount: number;
  totalImports: number;
  unmatchedCount: number;
  unmatchedAmount: number;
  lastImportAt: string | null;
}

export interface UnmatchedChargebackItem {
  cpe: string;
  chargebackAmount: number;
  unmatchedReason: string | null;
  fileData: FileDataRow | null;
}

export interface CommissionAnalysisData {
  commercials: CommissionAnalysisCommercial[];
  imports: ChargebackImportRecord[];
  unmatchedItems: UnmatchedChargebackItem[];
  summary: CommissionAnalysisSummary;
}

export interface ImportChargebackSummary {
  import_id: string;
  total_rows: number;
  chargeback_count: number;
  matched_rows: number;
  unmatched_rows: number;
  total_chargeback_amount: number;
}

export interface ImportChargebackRow {
  cpe: string;
  chargeback_amount: string;
  [key: string]: string;
}

const EMPTY_ANALYSIS: CommissionAnalysisData = {
  commercials: [],
  imports: [],
  unmatchedItems: [],
  summary: {
    totalCommissionAmount: 0,
    totalCommissionBaseCount: 0,
    totalChargebackAmount: 0,
    totalChargebackCount: 0,
    totalDifferentialAmount: 0,
    totalDifferentialCount: 0,
    totalImports: 0,
    unmatchedCount: 0,
    unmatchedAmount: 0,
    lastImportAt: null,
  },
};

function parseRawRow(raw: Record<string, unknown> | null): FileDataRow | null {
  if (!raw) return null;
  const get = (keys: string[]) => {
    for (const k of keys) {
      const val = raw[k];
      if (val != null && String(val).trim()) return String(val).trim();
    }
    return "";
  };
  return {
    tipoComissao: get(["Tipo de comissão", "Tipo de Comissão", "Tipo de comissao"]),
    nomeEmpresa: get(["Nome da Empresa", "Nome da empresa"]),
    tipo: get(["Tipo"]),
    cpe: get(["Linha de Contrato: Local de Consumo", "CPE", "cpe"]),
    consumoAnual: get(["Linha de Contrato: Consumo anual", "Consumo anual"]),
    duracaoContrato: get(["Duração contrato (anos)", "Duracao contrato (anos)"]),
    dataInicio: get(["Linha de Contrato: Data de inicio", "Linha de Contrato: Data de Inicio", "Data de inicio"]),
    dataFim: get(["Linha de Contrato: Data Fim de Contrato", "Data Fim de Contrato"]),
    dbl: get(["DBL"]),
    valorReceber: get(["Valor a receber", "Comissão Total"]),
  };
}

export function useCommissionAnalysis(selectedMonth: string, effectiveUserIds?: string[] | null) {
  const { organization } = useAuth();
  const { data: members = [] } = useTeamMembers();
  const liveCommissions = useLiveCommissions(selectedMonth, effectiveUserIds);
  const organizationId = organization?.id;

  const chargebackData = useQuery<ChargebackDataset>({
    queryKey: ["commission-chargeback-data", organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return { imports: [], items: [] } satisfies ChargebackDataset;
      }

      const [importsResult, itemsResult] = await Promise.all([
        (supabase as any)
          .from("commission_chargeback_imports")
          .select("id, created_at, file_name, total_rows, matched_rows, unmatched_rows, chargeback_count, total_chargeback_amount")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .range(0, 199),
        (supabase as any)
          .from("commission_chargeback_items")
          .select("id, import_id, matched_user_id, chargeback_amount, matched, cpe, unmatched_reason, raw_row")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .range(0, 4999),
      ]);

      if (importsResult.error) throw importsResult.error;
      if (itemsResult.error) throw itemsResult.error;

      return {
        imports: (importsResult.data || []) as ChargebackImportRecord[],
        items: (itemsResult.data || []) as ChargebackItemRecord[],
      } satisfies ChargebackDataset;
    },
    enabled: !!organizationId,
  });

  const data = useMemo<CommissionAnalysisData>(() => {
    const liveData = liveCommissions.data;
    const imports = chargebackData.data?.imports || [];
    const items = chargebackData.data?.items || [];

    if (!liveData && imports.length === 0 && items.length === 0) {
      return EMPTY_ANALYSIS;
    }

    const memberNameMap = new Map(
      members.map((member) => [member.user_id, member.full_name || member.email || "Comercial"])
    );

    const filteredItems = items.filter((item) => {
      if (!effectiveUserIds || effectiveUserIds.length === 0) return true;
      if (!item.matched_user_id) return false;
      return effectiveUserIds.includes(item.matched_user_id);
    });

    const byUser = new Map<string, CommissionAnalysisCommercial>();

    // Build file data map: matched_user_id -> FileDataRow[]
    const userFileData = new Map<string, FileDataRow[]>();
    for (const item of filteredItems) {
      if (!item.matched_user_id) continue;
      const parsed = parseRawRow(item.raw_row);
      if (parsed) {
        const arr = userFileData.get(item.matched_user_id) || [];
        arr.push(parsed);
        userFileData.set(item.matched_user_id, arr);
      }
    }

    for (const commercial of liveData?.commercials || []) {
      byUser.set(commercial.userId, {
        userId: commercial.userId,
        name: commercial.name,
        commissionAmount: commercial.totalIndicativa,
        commissionBaseCount: commercial.cpes.length,
        chargebackAmount: 0,
        chargebackCount: 0,
        differentialAmount: commercial.totalIndicativa,
        differentialCount: commercial.cpes.length,
        cpes: commercial.cpes,
        fileData: userFileData.get(commercial.userId) || [],
      });
    }

    for (const item of filteredItems) {
      if (!item.matched_user_id) continue;

      const existing = byUser.get(item.matched_user_id) || {
        userId: item.matched_user_id,
        name: memberNameMap.get(item.matched_user_id) || "Comercial",
        commissionAmount: 0,
        commissionBaseCount: 0,
        chargebackAmount: 0,
        chargebackCount: 0,
        differentialAmount: 0,
        differentialCount: 0,
        cpes: [],
        fileData: userFileData.get(item.matched_user_id) || [],
      };

      existing.chargebackAmount += Number(item.chargeback_amount || 0);
      existing.chargebackCount += 1;
      existing.differentialAmount = existing.commissionAmount - existing.chargebackAmount;
      existing.differentialCount = existing.commissionBaseCount - existing.chargebackCount;

      byUser.set(item.matched_user_id, existing);
    }

    const commercials = Array.from(byUser.values()).sort((a, b) => {
      if (b.chargebackAmount !== a.chargebackAmount) return b.chargebackAmount - a.chargebackAmount;
      if (b.commissionAmount !== a.commissionAmount) return b.commissionAmount - a.commissionAmount;
      return a.name.localeCompare(b.name, "pt-PT");
    });

    const totalCommissionAmount = commercials.reduce((sum, item) => sum + item.commissionAmount, 0);
    const totalCommissionBaseCount = commercials.reduce((sum, item) => sum + item.commissionBaseCount, 0);
    const totalChargebackAmount = commercials.reduce((sum, item) => sum + item.chargebackAmount, 0);
    const totalChargebackCount = commercials.reduce((sum, item) => sum + item.chargebackCount, 0);
    const unmatchedItems = effectiveUserIds && effectiveUserIds.length > 0
      ? []
      : items.filter((item) => !item.matched);
    const unmatchedCount = unmatchedItems.length;
    const unmatchedAmount = unmatchedItems.reduce((sum, item) => sum + Number(item.chargeback_amount || 0), 0);

    const unmatchedItemsList: UnmatchedChargebackItem[] = unmatchedItems.map((item) => ({
      cpe: item.cpe,
      chargebackAmount: Number(item.chargeback_amount || 0),
      unmatchedReason: item.unmatched_reason,
      fileData: parseRawRow(item.raw_row),
    }));

    return {
      commercials,
      imports,
      unmatchedItems: unmatchedItemsList,
      summary: {
        totalCommissionAmount,
        totalCommissionBaseCount,
        totalChargebackAmount,
        totalChargebackCount,
        totalDifferentialAmount: totalCommissionAmount - totalChargebackAmount,
        totalDifferentialCount: totalCommissionBaseCount - totalChargebackCount,
        totalImports: imports.length,
        unmatchedCount,
        unmatchedAmount,
        lastImportAt: imports[0]?.created_at || null,
      },
    } satisfies CommissionAnalysisData;
  }, [chargebackData.data?.imports, chargebackData.data?.items, effectiveUserIds, liveCommissions.data, members]);

  return {
    data,
    isLoading: liveCommissions.isLoading || chargebackData.isLoading,
    isError: liveCommissions.isError || chargebackData.isError,
    refetch: async () => {
      await Promise.all([liveCommissions.refetch(), chargebackData.refetch()]);
    },
  };
}

export function useImportCommissionChargebacks() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      fileName: string;
      cpeColumnName: string;
      rows: ImportChargebackRow[];
    }): Promise<ImportChargebackSummary> => {
      if (!organization?.id) {
        throw new Error("Organização não encontrada");
      }

      const { data, error } = await (supabase as any).rpc("import_commission_chargebacks", {
        p_organization_id: organization.id,
        p_file_name: params.fileName,
        p_cpe_column_name: params.cpeColumnName,
        p_rows: params.rows,
      });

      if (error) throw error;

      const summary = Array.isArray(data) ? data[0] : data;
      if (!summary) {
        throw new Error("Não foi possível concluir a importação");
      }

      return summary as ImportChargebackSummary;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["commission-chargeback-data", organization?.id] }),
        queryClient.invalidateQueries({ queryKey: ["commissions-live"] }),
      ]);
    },
  });
}
