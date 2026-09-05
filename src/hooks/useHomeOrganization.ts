import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations, type UserOrganization } from '@/hooks/useUserOrganizations';

/**
 * The user's own organization, and whether they are currently visiting someone
 * else's.
 *
 * A super admin can switch into any org from System Admin, including orgs they
 * are not a member of. When that happens the sidebar switcher is no help: it
 * only lists memberships, and with a single membership it is not even a
 * dropdown. So "home" is resolved from the memberships themselves (preferring
 * the one where the user is admin) and used as the way back.
 */
export function useHomeOrganization() {
  const { organization } = useAuth();
  const { data: organizations = [], isLoading } = useUserOrganizations();

  const home: UserOrganization | null = useMemo(() => {
    if (organizations.length === 0) return null;
    const active = organizations.filter((o) => o.is_active);
    const pool = active.length > 0 ? active : organizations;
    return pool.find((o) => o.member_role === 'admin') ?? pool[0];
  }, [organizations]);

  const isMemberOfActive = useMemo(
    () => !!organization?.id && organizations.some((o) => o.organization_id === organization.id),
    [organizations, organization?.id],
  );

  return {
    home,
    isLoading,
    /** True when the active org is not one of the user's own. */
    isVisiting: !!organization?.id && !isLoading && organizations.length > 0 && !isMemberOfActive,
    /** True when the active org already is home. */
    isAtHome: !!home && organization?.id === home.organization_id,
  };
}
