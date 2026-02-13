import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ContactList {
  id: string;
  name: string;
  description: string | null;
  organization_id: string;
  is_dynamic: boolean | null;
  created_at: string;
  updated_at: string;
  member_count: number;
}

export interface ContactListMember {
  id: string;
  list_id: string;
  client_id: string;
  added_at: string;
  client?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  };
}

export function useContactLists() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['contact-lists', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data: lists, error } = await supabase
        .from('client_lists')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get member counts
      const { data: members, error: membersError } = await supabase
        .from('client_list_members')
        .select('list_id');

      if (membersError) throw membersError;

      const countMap = new Map<string, number>();
      members?.forEach(m => {
        countMap.set(m.list_id, (countMap.get(m.list_id) || 0) + 1);
      });

      return lists.map(list => ({
        ...list,
        member_count: countMap.get(list.id) || 0,
      })) as ContactList[];
    },
    enabled: !!orgId,
  });
}

export function useContactListMembers(listId: string | null) {
  return useQuery({
    queryKey: ['contact-list-members', listId],
    queryFn: async () => {
      if (!listId) return [];

      const { data, error } = await supabase
        .from('client_list_members')
        .select('*, client:crm_clients(id, name, email, phone, company)')
        .eq('list_id', listId)
        .order('added_at', { ascending: false });

      if (error) throw error;
      return data as unknown as ContactListMember[];
    },
    enabled: !!listId,
  });
}

export function useCreateContactList() {
  const { organization } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('client_lists')
        .insert({ name, description: description || null, organization_id: organization!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Lista criada com sucesso');
    },
    onError: () => toast.error('Erro ao criar lista'),
  });
}

export function useUpdateContactList() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string }) => {
      const { error } = await supabase
        .from('client_lists')
        .update({ name, description: description || null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Lista atualizada');
    },
    onError: () => toast.error('Erro ao atualizar lista'),
  });
}

export function useDeleteContactList() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Delete members first
      await supabase.from('client_list_members').delete().eq('list_id', id);
      const { error } = await supabase.from('client_lists').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Lista eliminada');
    },
    onError: () => toast.error('Erro ao eliminar lista'),
  });
}

export function useAddListMembers() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, clientIds }: { listId: string; clientIds: string[] }) => {
      const rows = clientIds.map(client_id => ({ list_id: listId, client_id }));
      const { error } = await supabase
        .from('client_list_members')
        .upsert(rows, { onConflict: 'list_id,client_id', ignoreDuplicates: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-list-members'] });
      qc.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Contactos adicionados');
    },
    onError: () => toast.error('Erro ao adicionar contactos'),
  });
}

export function useRemoveListMember() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ listId, clientId }: { listId: string; clientId: string }) => {
      const { error } = await supabase
        .from('client_list_members')
        .delete()
        .eq('list_id', listId)
        .eq('client_id', clientId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact-list-members'] });
      qc.invalidateQueries({ queryKey: ['contact-lists'] });
      toast.success('Contacto removido da lista');
    },
    onError: () => toast.error('Erro ao remover contacto'),
  });
}
