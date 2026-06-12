import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Unified contact notes — one timeline per contact, keyed by phone, shared by the
// inbox and the CRM lead/client records. See migration 20260613220000.
export interface ContactNote {
  id: string;
  organization_id: string;
  phone: string;
  phone_key: string;
  content: string;
  created_by: string | null;
  author_name: string | null;
  source: string;
  created_at: string;
  updated_at: string;
}

// Last 9 digits — the join key shared by inbox conversations and CRM records,
// matching the existing phoneSuffix convention used elsewhere.
export function notePhoneKey(phone: string | null | undefined): string {
  return String(phone ?? '').replace(/\D/g, '').slice(-9);
}

// `contact_notes` isn't in the generated Supabase types yet — cast to keep TS
// happy until the types are regenerated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useContactNotes(phone: string | null | undefined) {
  const { organization } = useAuth();
  const key = notePhoneKey(phone);
  return useQuery({
    queryKey: ['contact-notes', organization?.id, key],
    queryFn: async (): Promise<ContactNote[]> => {
      if (!organization?.id || key.length < 6) return [];
      const { data, error } = await db
        .from('contact_notes')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('phone_key', key)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ContactNote[];
    },
    enabled: !!organization?.id && key.length >= 6,
  });
}

export function useAddContactNote() {
  const { organization, user, profile } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ phone, content, source = 'crm' }: { phone: string; content: string; source?: string }) => {
      if (!organization?.id) throw new Error('Organização não encontrada');
      const digits = String(phone ?? '').replace(/\D/g, '');
      const key = digits.slice(-9);
      if (key.length < 6) throw new Error('Contacto sem número de telefone válido');
      const { error } = await db.from('contact_notes').insert({
        organization_id: organization.id,
        phone: digits,
        phone_key: key,
        content: content.trim(),
        created_by: user?.id ?? null,
        author_name: profile?.full_name ?? null,
        source,
      });
      if (error) throw error;
      return { key };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['contact-notes', organization?.id, res.key] });
    },
  });
}

export function useDeleteContactNote() {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; phoneKey: string }) => {
      const { error } = await db.from('contact_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['contact-notes', organization?.id, vars.phoneKey] });
    },
  });
}
