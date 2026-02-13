import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { EmailCampaign, CampaignStatus } from '@/types/marketing';

interface CreateCampaignData {
  name: string;
  template_id?: string;
  subject?: string;
  html_content?: string;
  settings?: Record<string, boolean>;
  settings_data?: Record<string, string>;
}

export function useCampaigns() {
  const { organization } = useAuth();
  const organizationId = organization?.id;

  return useQuery({
    queryKey: ['email-campaigns', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('email_campaigns')
        .select('*, email_templates(id, name, subject)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        ...item,
        status: item.status as CampaignStatus,
        template: item.email_templates ? {
          id: item.email_templates.id,
          name: item.email_templates.name,
          subject: item.email_templates.subject,
        } : undefined,
      })) as EmailCampaign[];
    },
    enabled: !!organizationId,
  });
}

export function useCampaignSends(campaignId: string | null) {
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['campaign-sends', campaignId],
    queryFn: async () => {
      if (!campaignId || !organization?.id) return [];

      const { data, error } = await supabase
        .from('email_sends')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!campaignId && !!organization?.id,
  });
}

export function useCreateCampaign() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCampaignData) => {
      if (!organization?.id) throw new Error('Sem organização');

      const { data: campaign, error } = await supabase
        .from('email_campaigns')
        .insert({
          organization_id: organization.id,
          name: data.name,
          template_id: data.template_id || null,
          subject: data.subject || null,
          html_content: data.html_content || null,
          settings: data.settings || {},
          settings_data: data.settings_data || {},
          status: 'draft' as const,
          created_by: user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return campaign;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campanha criada');
    },
    onError: () => {
      toast.error('Erro ao criar campanha');
    },
  });
}

export function useUpdateCampaignStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, sent_count, failed_count, total_recipients }: {
      id: string;
      status: CampaignStatus;
      sent_count?: number;
      failed_count?: number;
      total_recipients?: number;
    }) => {
      const updateData: any = { status };
      if (sent_count !== undefined) updateData.sent_count = sent_count;
      if (failed_count !== undefined) updateData.failed_count = failed_count;
      if (total_recipients !== undefined) updateData.total_recipients = total_recipients;
      if (status === 'sent' || status === 'failed') updateData.sent_at = new Date().toISOString();

      const { error } = await supabase
        .from('email_campaigns')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
    },
  });
}

export function useDeleteCampaign() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!organization?.id) throw new Error('Sem organização');

      const { error } = await supabase
        .from('email_campaigns')
        .delete()
        .eq('id', id)
        .eq('organization_id', organization.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-campaigns'] });
      toast.success('Campanha eliminada');
    },
    onError: () => {
      toast.error('Erro ao eliminar campanha');
    },
  });
}
