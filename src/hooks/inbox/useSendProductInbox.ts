import { useCallback } from 'react';
import { useSendInboxMessage } from '@/hooks/useChatwootInbox';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/types/proposals';
import type { OutgoingAttachment } from '@/hooks/useChatwootInbox';

/**
 * Hook to send a product directly in an inbox conversation.
 *
 * - If the product has a primary image, fetches it and sends as an image attachment.
 * - Sends a formatted text message with name (bold), price, and description.
 */
export function useSendProductInbox() {
  const sendMessage = useSendInboxMessage();

  const sendProduct = useCallback(
    async (
      conversationId: number,
      product: Product,
      contactPhone?: string | null,
      inboxId?: number | null,
    ) => {
      const priceText = product.price != null ? `💰 ${formatCurrency(product.price)}` : '';
      const desc = product.description || '';
      const lines = [`*${product.name}*`];
      if (priceText) lines.push(priceText);
      if (desc) {
        lines.push('');
        lines.push(desc);
      }
      const text = lines.join('\n');

      let imageUrl: string | null = null;
      try {
        const { data: images } = await supabase
          .from('service_images')
          .select('url, is_primary')
          .eq('product_id', product.id)
          .order('is_primary', { ascending: false })
          .order('position', { ascending: true })
          .limit(1);
        if (images && images.length > 0) {
          imageUrl = images[0].url;
        }
      } catch {
        // Image fetch failed — proceed with text-only
      }

      if (imageUrl) {
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const attachment: OutgoingAttachment = {
            data,
            mimetype: blob.type || 'image/jpeg',
            filename: `${product.name || 'produto'}.jpg`,
            kind: 'image',
          };

          await sendMessage.mutateAsync({
            conversationId,
            content: text,
            contactPhone,
            inboxId,
            attachment,
          });
        } catch {
          await sendMessage.mutateAsync({
            conversationId,
            content: text,
            contactPhone,
            inboxId,
          });
        }
      } else {
        await sendMessage.mutateAsync({
          conversationId,
          content: text,
          contactPhone,
          inboxId,
        });
      }
    },
    [sendMessage],
  );

  return { sendProduct, isPending: sendMessage.isPending };
}
