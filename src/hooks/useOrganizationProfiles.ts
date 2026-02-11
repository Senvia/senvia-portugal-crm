import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ModulePermission {
  view: boolean;
  edit: boolean;
  delete: boolean;
}

export interface ModulePermissions {
  leads: ModulePermission;
  clients: ModulePermission;
  proposals: ModulePermission;
  sales: ModulePermission;
  finance: ModulePermission;
  calendar: ModulePermission;
  marketing: ModulePermission;
  ecommerce: ModulePermission;
  settings: ModulePermission;
}

export interface OrganizationProfile {
  id: string;
  organization_id: string;
  name: string;
  base_role: 'admin' | 'viewer' | 'salesperson';
  module_permissions: ModulePermissions;
  is_default: boolean;
  created_at: string;
}

const ALL_TRUE: ModulePermission = { view: true, edit: true, delete: true };
const VIEW_ONLY: ModulePermission = { view: true, edit: false, delete: false };
const NONE: ModulePermission = { view: false, edit: false, delete: false };

export const DEFAULT_ADMIN_PERMISSIONS: ModulePermissions = {
  leads: ALL_TRUE, clients: ALL_TRUE, proposals: ALL_TRUE, sales: ALL_TRUE,
  finance: ALL_TRUE, calendar: ALL_TRUE, marketing: ALL_TRUE, ecommerce: ALL_TRUE,
  settings: ALL_TRUE,
};

export const DEFAULT_VIEWER_PERMISSIONS: ModulePermissions = {
  leads: VIEW_ONLY, clients: VIEW_ONLY, proposals: VIEW_ONLY, sales: VIEW_ONLY,
  finance: VIEW_ONLY, calendar: VIEW_ONLY, marketing: VIEW_ONLY, ecommerce: VIEW_ONLY,
  settings: NONE,
};

export const MODULE_LABELS: Record<keyof ModulePermissions, string> = {
  leads: 'Leads',
  clients: 'Clientes',
  proposals: 'Propostas',
  sales: 'Vendas',
  finance: 'Finanças',
  calendar: 'Agenda',
  marketing: 'Marketing',
  ecommerce: 'E-commerce',
  settings: 'Definições',
};

export function useOrganizationProfiles() {
  const { organization } = useAuth();
  const organizationId = organization?.id;
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ['organization-profiles', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('organization_profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as OrganizationProfile[];
    },
    enabled: !!organizationId,
  });

  const createProfile = useMutation({
    mutationFn: async (profile: { name: string; base_role: string; module_permissions: ModulePermissions }) => {
      if (!organizationId) throw new Error('No organization');
      const { error } = await supabase
        .from('organization_profiles')
        .insert([{
          organization_id: organizationId,
          name: profile.name,
          base_role: profile.base_role,
          module_permissions: profile.module_permissions as any,
        }] as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-profiles', organizationId] });
      toast.success('Perfil criado com sucesso');
    },
    onError: () => toast.error('Erro ao criar perfil'),
  });

  const updateProfile = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; base_role?: string; module_permissions?: ModulePermissions }) => {
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.base_role !== undefined) updateData.base_role = updates.base_role;
      if (updates.module_permissions !== undefined) updateData.module_permissions = updates.module_permissions;
      
      const { error } = await supabase
        .from('organization_profiles')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-profiles', organizationId] });
      toast.success('Perfil atualizado');
    },
    onError: () => toast.error('Erro ao atualizar perfil'),
  });

  const deleteProfile = useMutation({
    mutationFn: async (id: string) => {
      // Check if profile is in use
      const { data: members } = await supabase
        .from('organization_members')
        .select('id')
        .eq('profile_id', id)
        .limit(1);
      
      if (members && members.length > 0) {
        throw new Error('Este perfil está em uso por membros da equipa');
      }

      const { error } = await supabase
        .from('organization_profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-profiles', organizationId] });
      toast.success('Perfil eliminado');
    },
    onError: (error: Error) => toast.error(error.message || 'Erro ao eliminar perfil'),
  });

  return {
    profiles: profiles || [],
    isLoading,
    createProfile,
    updateProfile,
    deleteProfile,
  };
}
