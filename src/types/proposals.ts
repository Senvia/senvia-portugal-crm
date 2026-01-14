// Proposal Types for Senvia OS

export type ProposalStatus = 'draft' | 'sent' | 'negotiating' | 'accepted' | 'rejected' | 'expired';

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  price: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  organization_id: string;
  lead_id: string;
  total_value: number;
  status: ProposalStatus;
  notes?: string | null;
  proposal_date: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  products?: ProposalProduct[];
  lead?: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
}

export interface ProposalProduct {
  id: string;
  proposal_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total: number;
  created_at: string;
  product?: Product;
}

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  draft: 'Rascunho',
  sent: 'Enviada',
  negotiating: 'Em Negociação',
  accepted: 'Aceite',
  rejected: 'Recusada',
  expired: 'Expirada',
};

export const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/20 text-blue-500',
  negotiating: 'bg-amber-500/20 text-amber-500',
  accepted: 'bg-green-500/20 text-green-500',
  rejected: 'bg-red-500/20 text-red-500',
  expired: 'bg-gray-500/20 text-gray-500',
};

export const PROPOSAL_STATUSES: ProposalStatus[] = ['draft', 'sent', 'negotiating', 'accepted', 'rejected', 'expired'];
