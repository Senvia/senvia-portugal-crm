import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { TeamMember } from '@/hooks/useTeam';

export function useUpdateProfile() {
  const { user, refetchUserData } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ full_name }: { full_name: string }) => {
      if (!user?.id) {
        throw new Error('Utilizador não autenticado');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ full_name: full_name.trim() })
        .eq('id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      refetchUserData();
      toast({
        title: 'Perfil atualizado',
        description: 'O seu nome foi atualizado com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o perfil.',
        variant: 'destructive',
      });
    },
  });
}

export function useChangePassword() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ newPassword }: { newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Password alterada',
        description: 'A sua password foi alterada com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error changing password:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar a password.',
        variant: 'destructive',
      });
    },
  });
}

interface ManageTeamMemberParams {
  action: 'change_password' | 'change_role' | 'toggle_status';
  user_id: string;
  new_password?: string;
  new_role?: 'admin' | 'viewer' | 'salesperson';
}

export function useManageTeamMember() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: ManageTeamMemberParams) => {
      const { data, error } = await supabase.functions.invoke('manage-team-member', {
        body: params,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao gerir colaborador');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onMutate: async (variables) => {
      // Cancelar queries em progresso
      await queryClient.cancelQueries({ queryKey: ['team-members', organization?.id] });
      
      // Guardar estado anterior para rollback
      const previousMembers = queryClient.getQueryData<TeamMember[]>(['team-members', organization?.id]);
      
      // Atualizar cache otimisticamente
      if (variables.action === 'toggle_status') {
        queryClient.setQueryData<TeamMember[]>(['team-members', organization?.id], (old) => {
          if (!old) return old;
          return old.map(member => 
            member.user_id === variables.user_id 
              ? { ...member, is_banned: !member.is_banned }
              : member
          );
        });
      }
      
      if (variables.action === 'change_role' && variables.new_role) {
        queryClient.setQueryData<TeamMember[]>(['team-members', organization?.id], (old) => {
          if (!old) return old;
          return old.map(member => 
            member.user_id === variables.user_id 
              ? { ...member, role: variables.new_role! }
              : member
          );
        });
      }
      
      return { previousMembers };
    },
    onError: (error: Error, _variables, context) => {
      // Reverter para estado anterior se falhar
      if (context?.previousMembers) {
        queryClient.setQueryData(['team-members', organization?.id], context.previousMembers);
      }
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: (_, variables) => {
      // Revalidar para garantir sincronização
      queryClient.invalidateQueries({ queryKey: ['team-members', organization?.id] });
      
      const messages = {
        change_password: { title: 'Password redefinida', description: 'A password do colaborador foi alterada com sucesso.' },
        change_role: { title: 'Perfil alterado', description: 'O perfil do colaborador foi atualizado com sucesso.' },
        toggle_status: { title: 'Estado alterado', description: 'O estado do colaborador foi atualizado com sucesso.' },
      };

      const msg = messages[variables.action];
      toast({ title: msg.title, description: msg.description });
    },
  });
}
