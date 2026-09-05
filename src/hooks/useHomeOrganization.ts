import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserOrganizations, type UserOrganization } from '@/hooks/useUserOrganizations';
import { SENVIA_ORG_ID } from '@/lib/senvia';

/**
 * The operator's own organization, and whether they are currently visiting
 * someone else's.
 *
 * A super admin can switch into any org from System Admin, including orgs they
 * are not a member of. When that happens the sidebar switcher is no help: it
 * only lists memberships, and with a single membership it is not even a
 * dropdown. So this resolves the way back.
 *
 * Senvia wins whenever it is available. Falling back to "first membership where
 * you are admin" is not good enough on its own: get_user_organizations orders by
 * joined_at, so it picks whichever org you happened to join first.
 */
export function useHomeOrganization() {
  const { organization, isSuperAdmin } = useAuth();
  const { data: organizations = [], isLoading } = useUserOrganizations();

  const isSenviaMember = organizations.some((o) => o.organization_id === SENVIA_ORG_ID);

  // A super admin may operate Senvia without holding a membership row in it.
  // Read it directly in that case rather than falling back to an arbitrary org.
  const { data: senviaOrg, isLoading: loadingSenvia } = useQuery({
    queryKey: ['home-org-senvia'],
    queryFn: async (): Promise<UserOrganization | null> => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, code, slug')
        .eq('id', SENVIA_ORG_ID)
        .maybeSingle();
      if (error || !data) return null;
      return {
        organization_id: data.id,
        organization_name: data.name,
        organization_code: data.code ?? '',
        organization_slug: data.slug,
        member_role: 'admin',
        is_active: true,
      } as UserOrganization;
    },
    enabled: isSuperAdmin && !isLoading && !isSenviaMember,
    staleTime: Infinity,
  });

  const home: UserOrganization | null = useMemo(() => {
    const active = organizations.filter((o) => o.is_active);
    const pool = active.length > 0 ? active : organizations;
    const senvia = pool.find((o) => o.organization_id === SENVIA_ORG_ID);
    if (senvia) return senvia;
    if (senviaOrg) return senviaOrg;
    if (pool.length === 0) return null;
    return pool.find((o) => o.member_role === 'admin') ?? pool[0];
  }, [organizations, senviaOrg]);

  const isMemberOfActive = useMemo(
    () => !!organization?.id && organizations.some((o) => o.organization_id === organization.id),
    [organizations, organization?.id],
  );

  return {
    home,
    isLoading: isLoading || loadingSenvia,
    /** True when the active org is not one of the user's own. */
    isVisiting: !!organization?.id && !isLoading && organizations.length > 0 && !isMemberOfActive,
    /** True when the active org already is home. */
    isAtHome: !!home && organization?.id === home.organization_id,
  };
}
