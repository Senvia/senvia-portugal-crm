import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ClientDocumentType {
  key: string;
  label: string;
}

/**
 * The org's client document checklist (CTR, ...).
 *
 * Deliberately its OWN query instead of another column on useOrganization's
 * select list: that one query feeds the product catalog, the niche gates and
 * half the app, so a column it can't read yet (a fresh migration whose schema
 * cache hasn't refreshed) takes everything down with it. Isolated here, the
 * worst case is an empty checklist.
 */
export function useClientDocumentTypes() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['client-document-types', orgId],
    enabled: !!orgId,
    queryFn: async (): Promise<ClientDocumentType[]> => {
      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('client_document_types')
        .eq('id', orgId)
        .single();
      if (error) {
        console.error('Error fetching client document types:', error);
        return [];
      }
      const types = data?.client_document_types;
      return Array.isArray(types) ? types : [];
    },
  });
}

export function useUpdateClientDocumentTypes() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (types: ClientDocumentType[]) => {
      const { error } = await (supabase as any)
        .from('organizations')
        .update({ client_document_types: types })
        .eq('id', organization?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-document-types'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao guardar documentos: ${error.message}`);
    },
  });
}
