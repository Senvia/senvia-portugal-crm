import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/types/proposals';

export function useProducts() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['products', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', organization!.id)
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!organization?.id,
  });
}

export function useActiveProducts() {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['products', 'active', organization?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('organization_id', organization!.id)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!organization?.id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string; price?: number }) => {
      const { error } = await supabase
        .from('products')
        .insert({
          organization_id: organization!.id,
          name: data.name,
          description: data.description || null,
          price: data.price || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produto criado', description: 'O produto foi adicionado com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível criar o produto.', variant: 'destructive' });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; description?: string | null; price?: number | null; is_active?: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produto atualizado', description: 'As alterações foram guardadas.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o produto.', variant: 'destructive' });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({ title: 'Produto eliminado', description: 'O produto foi removido.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível eliminar o produto.', variant: 'destructive' });
    },
  });
}
