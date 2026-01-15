import { create } from 'zustand';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';

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
  const { isAdmin, isSuperAdmin } = usePermissions();
  const { selectedMemberId, setSelectedMemberId } = useTeamFilterStore();

  // Para admin: pode filtrar por membro ou ver todos (null = todos)
  // Para outros (salesperson): sempre filtra pelo próprio user
  const canSeeAll = isAdmin || isSuperAdmin;
  
  const effectiveUserId = canSeeAll 
    ? selectedMemberId  // null = todos, id = específico
    : user?.id || null; // sempre o próprio

  const canFilterByTeam = canSeeAll;

  return {
    effectiveUserId,
    selectedMemberId,
    setSelectedMemberId,
    canFilterByTeam,
    isFilteringAll: canSeeAll && !selectedMemberId,
    currentUserId: user?.id,
  };
}
