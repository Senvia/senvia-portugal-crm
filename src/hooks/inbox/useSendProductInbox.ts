import { useCallback } from 'react';
import { useSendInboxMessage } from '@/hooks/useChatwootInbox';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import type { EcommerceProduct } from '@/types/ecommerce';
import type { OutgoingAttachment } from '@/hooks/useChatwootInbox';

/**
 * Hook to send a product directly in an inbox conversation.
 *
 * - If the product has a primary image, fetches it and sends as an image attachment.
 * - Sends a formatted text message with name (bold), price, and description.
 *
 * Note: useActiveEcommerceProducts does NOT join product_images, so we fetch
 * the image here via a separate query to avoid N+1 queries in the picker.
 */
export function useSendProductInbox() {
  const sendMessage = useSendInboxMessage();

  const sendProduct = useCallback(
    async (
      conversationId: number,
      product: EcommerceProduct,
      contactPhone?: string | null,
      inboxId?: number | null,
    ) => {
      // Build the formatted text message (WhatsApp formatting):
      //   *Product Name*
      //   💰 19,99 €
      //
      //   Short description here.
      const priceText = product.price != null ? `💰 ${formatCurrency(product.price)}` : '';
      const desc = product.short_description || product.description || '';
      const lines = [`*${product.name}*`];
      if (priceText) lines.push(priceText);
      if (desc) {
        lines.push('');
        lines.push(desc);
      }
      const text = lines.join('\n');

      // Fetch the primary image from product_images table.
      // useActiveEcommerceProducts doesn't join images, so we do it here.
      let imageUrl: string | null = null;
      try {
        const { data: images } = await supabase
          .from('product_images')
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
          // Fetch the image and convert to base64
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

          // Send image with caption
          await sendMessage.mutateAsync({
            conversationId,
            content: text,
            contactPhone,
            inboxId,
            attachment,
          });
        } catch {
          // If image fetch fails, send text only
          await sendMessage.mutateAsync({
            conversationId,
            content: text,
            contactPhone,
            inboxId,
          });
        }
      } else {
        // No image — send text only
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
