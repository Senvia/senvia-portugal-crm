import { useLeads } from "./useLeads";
import { useProposals } from "./useProposals";

export function useDashboardStats() {
  const { data: leads = [], isLoading: leadsLoading } = useLeads();
  const { data: proposals = [], isLoading: proposalsLoading } = useProposals();

  // Leads stats
  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'new').length;
  const wonLeads = leads.filter(l => l.status === 'won').length;
  const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;

  // Propostas em aberto (draft, sent, negotiating)
  const openProposals = proposals.filter(p => 
    ['draft', 'sent', 'negotiating'].includes(p.status)
  );
  const openProposalsCount = openProposals.length;
  const openProposalsValue = openProposals.reduce((sum, p) => sum + (p.total_value || 0), 0);

  // Propostas aceites
  const acceptedProposalsValue = proposals
    .filter(p => p.status === 'accepted')
    .reduce((sum, p) => sum + (p.total_value || 0), 0);

  return {
    totalLeads,
    newLeads,
    conversionRate,
    openProposalsCount,
    openProposalsValue,
    acceptedProposalsValue,
    isLoading: leadsLoading || proposalsLoading,
  };
}
