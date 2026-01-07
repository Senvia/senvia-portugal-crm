import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TeamMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  organization_id: string | null;
  role: 'admin' | 'viewer' | 'super_admin';
  user_id: string;
}

export interface PendingInvite {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  token: string;
  created_at: string;
  expires_at: string;
  status: string;
}

export function useTeamMembers() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['team-members', organization?.id],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!organization?.id) return [];

      // Get profiles for this organization
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, organization_id')
        .eq('organization_id', organization.id);

      if (profilesError) throw profilesError;
      if (!profiles || profiles.length === 0) return [];

      // Get roles for these users
      const userIds = profiles.map(p => p.id);
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      if (rolesError) throw rolesError;

      // Merge profiles with roles
      return profiles.map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          user_id: profile.id,
          role: (userRole?.role as 'admin' | 'viewer' | 'super_admin') || 'viewer',
        };
      });
    },
    enabled: !!organization?.id,
  });
}

export function usePendingInvites() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['pending-invites', organization?.id],
    queryFn: async (): Promise<PendingInvite[]> => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('organization_invites')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as PendingInvite[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateInvite() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'admin' | 'viewer' }) => {
      if (!organization?.id || !user?.id) {
        throw new Error('Organização não encontrada');
      }

      const { data, error } = await supabase
        .from('organization_invites')
        .insert({
          organization_id: organization.id,
          email: email.toLowerCase().trim(),
          role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe um convite pendente para este email.');
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      toast({
        title: 'Convite criado',
        description: 'O link de convite foi gerado com sucesso.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao criar convite',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useCancelInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('organization_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      toast({
        title: 'Convite cancelado',
        description: 'O convite foi removido com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar o convite.',
        variant: 'destructive',
      });
    },
  });
}

export function useResendInvite() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      // Renovar data de expiração para +7 dias
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 7);
      
      const { data, error } = await supabase
        .from('organization_invites')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('id', inviteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      toast({
        title: 'Convite renovado',
        description: `O convite para ${data.email} foi renovado por mais 7 dias.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível renovar o convite.',
        variant: 'destructive',
      });
    },
  });
}
