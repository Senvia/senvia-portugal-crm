import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface LeadImportRow {
  id: string;
  organization_id: string;
  imported_by: string;
  import_code: string;
  name: string | null;
  file_name: string | null;
  stage_key: string;
  assignee_ids: string[];
  total_inserted: number;
  total_failed: number;
  first_error: string | null;
  created_at: string;
  /** Number of leads from this import that still exist in the leads table. */
  leads_remaining: number;
  /** Number of those that have any activity (proposal/sale/order/client/event). */
  leads_with_activity: number;
  /** Display name for the importer (full_name fallback to id). */
  importer_name: string | null;
}

/**
 * Lists the import history for the current org, enriched with the live counts
 * needed to decide whether the delete button should be enabled.
 */
export function useLeadImports() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['lead-imports', organizationId],
    queryFn: async (): Promise<LeadImportRow[]> => {
      if (!organizationId) return [];

      const { data: imports, error } = await supabase
        .from('lead_imports' as any)
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (!imports || imports.length === 0) return [];

      const importIds = (imports as any[]).map(i => i.id as string);

      // Fetch live leads to compute remaining + with-activity per import.
      const { data: leads } = await supabase
        .from('leads')
        .select('id, import_id')
        .in('import_id', importIds);

      const leadsByImport = new Map<string, string[]>();
      for (const l of (leads as any[]) || []) {
        if (!l.import_id) continue;
        const arr = leadsByImport.get(l.import_id as string) || [];
        arr.push(l.id as string);
        leadsByImport.set(l.import_id as string, arr);
      }

      const allLeadIds = ((leads as any[]) || []).map(l => l.id as string);
      const activeLeadIds = new Set<string>();
      if (allLeadIds.length > 0) {
        const [propsRes, eventsRes, clientsRes, salesRes, ordersRes] = await Promise.all([
          supabase.from('proposals').select('lead_id').in('lead_id', allLeadIds),
          supabase.from('calendar_events').select('lead_id').in('lead_id', allLeadIds),
          supabase.from('crm_clients').select('lead_id').in('lead_id', allLeadIds),
          supabase.from('sales').select('lead_id').in('lead_id', allLeadIds),
          supabase.from('orders' as any).select('lead_id').in('lead_id', allLeadIds),
        ]);
        for (const row of [
          ...((propsRes.data as any[]) || []),
          ...((eventsRes.data as any[]) || []),
          ...((clientsRes.data as any[]) || []),
          ...((salesRes.data as any[]) || []),
          ...((ordersRes.data as any[]) || []),
        ]) {
          if (row.lead_id) activeLeadIds.add(row.lead_id as string);
        }
      }

      // Resolve importer names
      const importerIds = [...new Set((imports as any[]).map(i => i.imported_by as string))];
      const { data: profiles } = importerIds.length > 0
        ? await supabase.from('profiles').select('id, full_name').in('id', importerIds)
        : { data: [] as any[] };
      const importerMap = new Map<string, string | null>(
        ((profiles as any[]) || []).map(p => [p.id as string, (p.full_name as string) || null])
      );

      return (imports as any[]).map(i => {
        const ids = leadsByImport.get(i.id as string) || [];
        const withActivity = ids.filter(id => activeLeadIds.has(id)).length;
        return {
          id: i.id,
          organization_id: i.organization_id,
          imported_by: i.imported_by,
          import_code: i.import_code,
          name: i.name ?? null,
          file_name: i.file_name ?? null,
          stage_key: i.stage_key,
          assignee_ids: i.assignee_ids || [],
          total_inserted: i.total_inserted ?? 0,
          total_failed: i.total_failed ?? 0,
          first_error: i.first_error ?? null,
          created_at: i.created_at,
          leads_remaining: ids.length,
          leads_with_activity: withActivity,
          importer_name: importerMap.get(i.imported_by as string) ?? null,
        };
      });
    },
    enabled: !!organizationId,
  });
}

/**
 * Delete a whole import batch (and all its leads). The RPC blocks the delete
 * if ANY lead in the batch has activity — the UI should pre-filter by
 * `leads_with_activity` to avoid showing this error to users.
 */
export function useDeleteLeadImport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (importId: string) => {
      const { data, error } = await (supabase as any).rpc('delete_lead_import', { p_import_id: importId });
      if (error) throw error;
      return data as { deleted: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lead-imports'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast({
        title: 'Importação apagada',
        description: `${data?.deleted ?? 0} lead(s) removido(s).`,
      });
    },
    onError: (error: any) => {
      const msg = error?.message || 'Não foi possível apagar a importação.';
      const friendly = msg.includes('have activity')
        ? 'Esta importação tem leads com atividade. Apaga-os primeiro ou contacta um administrador.'
        : msg.includes('Permission denied')
          ? 'Não tens permissão para apagar importações.'
          : msg;
      toast({
        title: 'Erro ao apagar importação',
        description: friendly,
        variant: 'destructive',
      });
    },
  });
}
