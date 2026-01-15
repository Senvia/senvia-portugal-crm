import { useState } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useProposals, useUpdateProposal } from '@/hooks/useProposals';
import { useProposalsRealtime } from '@/hooks/useRealtimeSubscription';
import { TeamMemberFilter } from '@/components/dashboard/TeamMemberFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Search, Filter, Plus } from 'lucide-react';
import { ProposalDetailsModal } from '@/components/proposals/ProposalDetailsModal';
import { CreateProposalModal } from '@/components/proposals/CreateProposalModal';
import { 
  PROPOSAL_STATUS_LABELS, 
  PROPOSAL_STATUS_COLORS, 
  PROPOSAL_STATUSES 
} from '@/types/proposals';
import type { Proposal, ProposalStatus } from '@/types/proposals';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function Proposals() {
  // Subscribe to realtime updates
  useProposalsRealtime();
  const { profile, organization } = useAuth();
  const { data: proposals = [], isLoading } = useProposals();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const filteredProposals = proposals.filter((proposal) => {
    const matchesSearch = !search || 
      proposal.client?.name?.toLowerCase().includes(search.toLowerCase()) ||
      proposal.lead?.name?.toLowerCase().includes(search.toLowerCase()) ||
      proposal.notes?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);
  };

  // Group proposals by status for summary
  const proposalsByStatus = PROPOSAL_STATUSES.reduce((acc, status) => {
    acc[status] = proposals.filter(p => p.status === status);
    return acc;
  }, {} as Record<ProposalStatus, Proposal[]>);

  const totalValue = proposals.reduce((sum, p) => sum + Number(p.total_value), 0);
  const pendingValue = proposals
    .filter(p => ['sent', 'negotiating'].includes(p.status))
    .reduce((sum, p) => sum + Number(p.total_value), 0);

  return (
    <AppLayout userName={profile?.full_name} organizationName={organization?.name}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Propostas
            </h1>
            <p className="text-muted-foreground">Gestão de propostas comerciais.</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Proposta
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Total Propostas</p>
              <p className="text-2xl font-bold">{proposals.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(totalValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Em Negociação</p>
              <p className="text-2xl font-bold text-amber-500">{formatCurrency(pendingValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">Aceites</p>
              <p className="text-2xl font-bold text-green-500">{proposalsByStatus.accepted?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por cliente ou lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <TeamMemberFilter className="w-full sm:w-[180px]" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProposalStatus | 'all')}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {PROPOSAL_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {PROPOSAL_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


        {/* Proposals List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredProposals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {proposals.length === 0
                  ? 'Ainda não existem propostas.'
                  : 'Nenhuma proposta corresponde aos filtros.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredProposals.map((proposal) => (
              <Card
                key={proposal.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedProposal(proposal)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={cn('text-xs', PROPOSAL_STATUS_COLORS[proposal.status])}>
                        {PROPOSAL_STATUS_LABELS[proposal.status]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(proposal.proposal_date), "d MMM yyyy", { locale: pt })}
                      </span>
                    </div>
                    <p className="font-medium truncate">{proposal.client?.name || proposal.lead?.name || 'Proposta Avulsa'}</p>
                    {proposal.notes && (
                      <p className="text-sm text-muted-foreground truncate">{proposal.notes}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(proposal.total_value)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <CreateProposalModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      {selectedProposal && (
        <ProposalDetailsModal
          proposal={selectedProposal}
          open={!!selectedProposal}
          onOpenChange={(open) => !open && setSelectedProposal(null)}
        />
      )}
    </AppLayout>
  );
}
