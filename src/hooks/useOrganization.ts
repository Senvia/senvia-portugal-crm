import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

import { FormSettings } from '@/types';
import { Json } from '@/integrations/supabase/types';

interface UpdateOrganizationData {
  name?: string;
  webhook_url?: string | null;
  whatsapp_instance?: string | null;
  whatsapp_number?: string | null;
  whatsapp_api_key?: string | null;
  form_settings?: Json;
}

export function useUpdateOrganization() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateOrganizationData) => {
      if (!organization?.id) {
        throw new Error('Organização não encontrada');
      }

      const { error } = await supabase
        .from('organizations')
        .update(data)
        .eq('id', organization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast({
        title: 'Guardado',
        description: 'Definições atualizadas com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error updating organization:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as definições.',
        variant: 'destructive',
      });
    },
  });
}

export function useTestWebhook() {
  const { organization } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (webhookUrl: string) => {
      if (!webhookUrl) {
        throw new Error('URL do webhook não definido');
      }

      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        organization: {
          id: organization?.id,
          name: organization?.name,
        },
        whatsapp: {
          instance: 'instancia-teste',
          number: '+351912345678',
          api_key: 'xxx-api-key-exemplo-xxx',
        },
        lead: {
          id: 'test-lead-id',
          name: 'Lead de Teste',
          email: 'teste@exemplo.com',
          phone: '+351912345678',
          source: 'Teste de Webhook',
          status: 'new',
          temperature: 'warm',
          value: 1500,
          notes: 'Mensagem de exemplo do lead',
          gdpr_consent: true,
          custom_data: {
            campo_exemplo: 'Valor de exemplo',
            utm_source: 'facebook',
            utm_campaign: 'campanha_teste',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      if (!response.ok) {
        throw new Error(`Webhook retornou status ${response.status}`);
      }

      return response;
    },
    onSuccess: () => {
      toast({
        title: 'Webhook testado',
        description: 'O webhook respondeu com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Webhook test failed:', error);
      toast({
        title: 'Erro no teste',
        description: 'O webhook não respondeu corretamente. Verifique o URL.',
        variant: 'destructive',
      });
    },
  });
}
