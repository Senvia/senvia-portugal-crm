import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ModulePermissions, ModulePermission } from '@/hooks/useOrganizationProfiles';

const ALL_ACCESS: ModulePermission = { view: true, edit: true, delete: true };
const FULL_PERMISSIONS: ModulePermissions = {
  leads: ALL_ACCESS, clients: ALL_ACCESS, proposals: ALL_ACCESS, sales: ALL_ACCESS,
  finance: ALL_ACCESS, calendar: ALL_ACCESS, marketing: ALL_ACCESS, ecommerce: ALL_ACCESS,
  settings: ALL_ACCESS,
};

export function usePermissions() {
  const { roles, user, organization } = useAuth();

  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = roles.includes('admin') || isSuperAdmin;
  const isViewer = roles.includes('viewer') && !isAdmin;

  // Load the current user's profile permissions from organization_members
  const { data: modulePermissions } = useQuery({
    queryKey: ['user-profile-permissions', user?.id, organization?.id],
    queryFn: async () => {
      if (!user?.id || !organization?.id) return null;
      
      const { data: member } = await supabase
        .from('organization_members')
        .select('profile_id')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .single();
      
      if (!member?.profile_id) return null;

      const { data: profile } = await supabase
        .from('organization_profiles')
        .select('module_permissions')
        .eq('id', member.profile_id)
        .single();
      
      return (profile?.module_permissions as unknown as ModulePermissions) || null;
    },
    enabled: !!user?.id && !!organization?.id && !isSuperAdmin,
  });

  // If super_admin or no profile assigned, use role-based defaults
  const effectivePermissions: ModulePermissions = isSuperAdmin
    ? FULL_PERMISSIONS
    : modulePermissions || (isAdmin ? FULL_PERMISSIONS : {
        leads: { view: true, edit: !isViewer, delete: false },
        clients: { view: true, edit: !isViewer, delete: false },
        proposals: { view: true, edit: !isViewer, delete: false },
        sales: { view: true, edit: !isViewer, delete: false },
        finance: { view: true, edit: false, delete: false },
        calendar: { view: true, edit: !isViewer, delete: false },
        marketing: { view: true, edit: false, delete: false },
        ecommerce: { view: true, edit: false, delete: false },
        settings: { view: isAdmin, edit: isAdmin, delete: isAdmin },
      });

  return {
    // Legacy permissions (backward compat)
    canEditLeads: effectivePermissions.leads?.edit ?? isAdmin,
    canDeleteLeads: effectivePermissions.leads?.delete ?? isAdmin,
    canChangeLeadStatus: true,

    canAccessSettings: effectivePermissions.settings?.view ?? isAdmin,
    canManageTeam: isAdmin, // Team management always requires admin base role
    canManageIntegrations: effectivePermissions.settings?.edit ?? isAdmin,

    // Role checks
    isAdmin,
    isViewer,
    isSuperAdmin,

    // Granular module permissions
    modulePermissions: effectivePermissions,
  };
}
