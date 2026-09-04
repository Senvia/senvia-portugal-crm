import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import type { ProfileDashboardWidget } from '@/hooks/useOrganizationProfiles';

/**
 * Which profile row actually drives the dashboard for the person looking at
 * it — the same resolution useDashboardWidgets does when it decides what to
 * render, so the "Editar Dashboard" button writes to the row it is reading.
 *
 * Their own profile when they have one; otherwise the organization's admin
 * profile, which is the fallback a super admin (whose permissions query is
 * skipped entirely) and any admin without an assigned profile end up on.
 *
 * The list lives on the PROFILE, not on the person, so a change here is seen
 * by everyone sharing that profile. There is no per-user override to write
 * to — that would need its own table.
 */
export function useDashboardEditorTarget() {
  const { user, organization } = useAuth();
  const { isAdmin, isSuperAdmin } = usePermissions();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ['dashboard-editor-target', orgId, user?.id],
    queryFn: async () => {
      if (!orgId || !user?.id) return null;

      const { data: member } = await supabase
        .from('organization_members')
        .select('profile_id')
        .eq('user_id', user.id)
        .eq('organization_id', orgId)
        .maybeSingle();

      const profileId = member?.profile_id ?? null;
      if (profileId) {
        const { data: own } = await supabase
          .from('organization_profiles')
          .select('id, name, dashboard_widgets')
          .eq('id', profileId)
          .maybeSingle();
        if (own) {
          return {
            id: own.id as string,
            name: own.name as string,
            widgets: (own as any).dashboard_widgets as ProfileDashboardWidget[] | null,
          };
        }
      }

      const { data: adminProfile } = await supabase
        .from('organization_profiles')
        .select('id, name, dashboard_widgets')
        .eq('organization_id', orgId)
        .eq('base_role', 'admin')
        .limit(1)
        .maybeSingle();

      if (!adminProfile) return null;
      return {
        id: adminProfile.id as string,
        name: adminProfile.name as string,
        widgets: (adminProfile as any).dashboard_widgets as ProfileDashboardWidget[] | null,
      };
    },
    // Only an admin can write to organization_profiles (RLS), so there is
    // nothing to resolve for anyone else.
    enabled: !!orgId && !!user?.id && (isAdmin || isSuperAdmin),
  });
}

export function useSaveDashboardWidgets() {
  const queryClient = useQueryClient();
  const { organization } = useAuth();

  return useMutation({
    mutationFn: async ({ profileId, widgets }: { profileId: string; widgets: ProfileDashboardWidget[] }) => {
      const { error } = await supabase
        .from('organization_profiles')
        .update({ dashboard_widgets: widgets } as any)
        .eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      // Both paths useDashboardWidgets can read the list from.
      queryClient.invalidateQueries({ queryKey: ['user-profile-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-profile-widgets', organization?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-editor-target'] });
      queryClient.invalidateQueries({ queryKey: ['organization-profiles', organization?.id] });
      toast.success('Dashboard atualizado');
    },
    onError: () => toast.error('Erro ao guardar o dashboard'),
  });
}
