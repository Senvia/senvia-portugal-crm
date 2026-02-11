import { create } from 'zustand';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { useTeams, useAllTeamMembersEntries } from '@/hooks/useTeams';
import { useMemo } from 'react';

interface TeamFilterStore {
  selectedMemberId: string | null;
  setSelectedMemberId: (id: string | null) => void;
}

// Estado global para o filtro de equipa (admin)
export const useTeamFilterStore = create<TeamFilterStore>((set) => ({
  selectedMemberId: null,
  setSelectedMemberId: (id) => set({ selectedMemberId: id }),
}));

export function useTeamFilter() {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, dataScope } = usePermissions();
  const { selectedMemberId, setSelectedMemberId } = useTeamFilterStore();
  const { data: teams = [] } = useTeams();
  const { data: allEntries = [] } = useAllTeamMembersEntries();

  // Visibility is now driven by the profile's data_scope
  const canSeeAll = dataScope === 'all';
  const canSeeTeam = dataScope === 'team';

  // Check if current user is a team leader
  const ledTeam = useMemo(() => {
    if (!user?.id) return null;
    return teams.find(t => t.leader_id === user.id) || null;
  }, [teams, user?.id]);

  const isTeamLeader = !!ledTeam;

  // Get member IDs for the leader's team
  const teamMemberIds = useMemo(() => {
    if (!ledTeam) return [];
    return allEntries.filter(e => e.team_id === ledTeam.id).map(e => e.user_id);
  }, [ledTeam, allEntries]);

  // Effective user IDs for data filtering (array)
  const effectiveUserIds: string[] | null = useMemo(() => {
    if (canSeeAll) {
      // data_scope=all: if filtering by specific member, return [that member], else null (all)
      return selectedMemberId ? [selectedMemberId] : null;
    }
    if (canSeeTeam && isTeamLeader && user?.id) {
      // data_scope=team + leader: see own + team members
      if (selectedMemberId) return [selectedMemberId];
      return [user.id, ...teamMemberIds];
    }
    // data_scope=own: only own data
    return user?.id ? [user.id] : null;
  }, [canSeeAll, canSeeTeam, isTeamLeader, selectedMemberId, user?.id, teamMemberIds]);

  // Legacy single-user compat
  const effectiveUserId = canSeeAll
    ? selectedMemberId
    : (canSeeTeam && isTeamLeader)
      ? selectedMemberId || null
      : user?.id || null;

  const canFilterByTeam = canSeeAll || (canSeeTeam && isTeamLeader);

  return {
    effectiveUserId,
    effectiveUserIds,
    selectedMemberId,
    setSelectedMemberId,
    canFilterByTeam,
    isFilteringAll: canSeeAll && !selectedMemberId,
    isTeamLeader,
    ledTeam,
    teamMemberIds,
    currentUserId: user?.id,
    dataScope,
  };
}
