import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useUpdateProfile() {
  const { user } = useAuth();
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
  new_role?: 'admin' | 'viewer';
}

export function useManageTeamMember() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: ManageTeamMemberParams) => {
      const { data, error } = await supabase.functions.invoke('manage-team-member', {
        body: params,
      });

      if (error) {
        throw new Error(error.message || 'Erro ao gerir membro');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      
      const messages = {
        change_password: { title: 'Password redefinida', description: 'A password do membro foi alterada com sucesso.' },
        change_role: { title: 'Perfil alterado', description: 'O perfil do membro foi atualizado com sucesso.' },
        toggle_status: { title: 'Estado alterado', description: 'O estado do membro foi atualizado com sucesso.' },
      };

      const msg = messages[variables.action];
      toast({ title: msg.title, description: msg.description });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
