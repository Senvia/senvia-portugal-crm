import { useAuth } from '@/contexts/AuthContext';

export function usePermissions() {
  const { roles } = useAuth();

  const isSuperAdmin = roles.includes('super_admin');
  const isAdmin = roles.includes('admin') || isSuperAdmin;
  const isViewer = roles.includes('viewer') && !isAdmin;

  return {
    // Lead permissions
    canEditLeads: isAdmin,
    canDeleteLeads: isAdmin,
    canChangeLeadStatus: true, // All users can change status

    // Settings permissions
    canAccessSettings: isAdmin,
    canManageTeam: isAdmin,
    canManageIntegrations: isAdmin,

    // Role checks
    isAdmin,
    isViewer,
    isSuperAdmin,
  };
}
