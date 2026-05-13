import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Json } from '@/integrations/supabase/types';

/**
 * Factory hook for entity field-settings.
 *
 * Every entity (lead, sale, proposal, client) stores its settings in
 * `organizations.<entity>_fields_settings`. This factory removes the
 * copy-paste that previously existed across four identical hooks.
 */

type EntityType = 'lead' | 'sale' | 'proposal' | 'client';

const COLUMN_MAP: Record<EntityType, string> = {
  lead: 'lead_fields_settings',
  sale: 'sale_fields_settings',
  proposal: 'proposal_fields_settings',
  client: 'client_fields_settings',
};

const LABEL_MAP: Record<EntityType, string> = {
  lead: 'leads',
  sale: 'vendas',
  proposal: 'propostas',
  client: 'clientes',
};

export function useEntityFieldsSettings<T extends Record<string, unknown>>(
  entity: EntityType,
  defaults: T,
) {
  const { organization } = useAuth();
  const column = COLUMN_MAP[entity];

  return useQuery({
    queryKey: [`${entity}_fields_settings`, organization?.id],
    queryFn: async () => {
      if (!organization?.id) return defaults;

      const { data, error } = await supabase
        .from('organizations')
        .select(column)
        .eq('id', organization.id)
        .single();

      if (error) throw error;

      const settings = (data as any)?.[column] as T | null;
      if (!settings) return defaults;

      return { ...defaults, ...settings };
    },
    enabled: !!organization?.id,
  });
}

export function useUpdateEntityFieldsSettings<T extends Record<string, unknown>>(
  entity: EntityType,
) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const column = COLUMN_MAP[entity];
  const label = LABEL_MAP[entity];

  return useMutation({
    mutationFn: async (settings: T) => {
      if (!organization?.id) throw new Error('Organização não encontrada');

      const { error } = await supabase
        .from('organizations')
        .update({ [column]: settings as unknown as Json })
        .eq('id', organization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${entity}_fields_settings`] });
      if (entity === 'client') {
        queryClient.invalidateQueries({ queryKey: ['organization'] });
      }
      toast({ title: 'Guardado', description: `Definições de campos de ${label} atualizadas.` });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível atualizar as definições.', variant: 'destructive' });
    },
  });
}
