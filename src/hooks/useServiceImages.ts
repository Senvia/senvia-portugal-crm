import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ServiceImage } from '@/types/proposals';

export function useServiceImages(productId: string | undefined) {
  return useQuery({
    queryKey: ['service-images', productId],
    queryFn: async () => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('service_images')
        .select('*')
        .eq('product_id', productId)
        .order('is_primary', { ascending: false })
        .order('position', { ascending: true });

      if (error) throw error;
      return data as ServiceImage[];
    },
    enabled: !!productId,
  });
}

export function useUploadServiceImage() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      productId,
      file,
      isPrimary = false,
    }: {
      productId: string;
      file: File;
      isPrimary?: boolean;
    }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');

      const fileExt = file.name.split('.').pop();
      const fileName = `${productId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      const { data: existingImages } = await supabase
        .from('service_images')
        .select('position')
        .eq('product_id', productId)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (existingImages?.[0]?.position ?? -1) + 1;

      if (isPrimary) {
        await supabase
          .from('service_images')
          .update({ is_primary: false })
          .eq('product_id', productId);
      }

      const { data: hasAny } = await supabase
        .from('service_images')
        .select('id')
        .eq('product_id', productId)
        .limit(1);

      const shouldBePrimary = isPrimary || !hasAny || hasAny.length === 0;

      const { data, error } = await supabase
        .from('service_images')
        .insert({
          product_id: productId,
          organization_id: organization.id,
          url: urlData.publicUrl,
          is_primary: shouldBePrimary,
          position: nextPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-images', variables.productId] });
      toast({ title: 'Imagem adicionada' });
    },
    onError: (error: Error) => {
      console.error('Error uploading service image:', error);
      toast({ title: 'Erro ao carregar imagem', variant: 'destructive' });
    },
  });
}

export function useDeleteServiceImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ imageId, productId, url }: { imageId: string; productId: string; url: string }) => {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/\/product-images\/(.+)$/);

      if (pathMatch) {
        await supabase.storage
          .from('product-images')
          .remove([pathMatch[1]]);
      }

      const { error } = await supabase
        .from('service_images')
        .delete()
        .eq('id', imageId);

      if (error) throw error;
      return productId;
    },
    onSuccess: (productId) => {
      queryClient.invalidateQueries({ queryKey: ['service-images', productId] });
      toast({ title: 'Imagem eliminada' });
    },
    onError: (error: Error) => {
      console.error('Error deleting service image:', error);
      toast({ title: 'Erro ao eliminar imagem', variant: 'destructive' });
    },
  });
}

export function useSetPrimaryServiceImage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ imageId, productId }: { imageId: string; productId: string }) => {
      await supabase
        .from('service_images')
        .update({ is_primary: false })
        .eq('product_id', productId);

      const { data, error } = await supabase
        .from('service_images')
        .update({ is_primary: true })
        .eq('id', imageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-images', variables.productId] });
      toast({ title: 'Imagem principal definida' });
    },
    onError: (error: Error) => {
      console.error('Error setting primary service image:', error);
      toast({ title: 'Erro ao definir imagem principal', variant: 'destructive' });
    },
  });
}
