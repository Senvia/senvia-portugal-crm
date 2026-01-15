export type SaleStatus = 'pending' | 'in_progress' | 'delivered' | 'cancelled';

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  pending: 'Pendente',
  in_progress: 'Em Progresso',
  delivered: 'Entregue',
  cancelled: 'Cancelado',
};

export const SALE_STATUS_COLORS: Record<SaleStatus, string> = {
  pending: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
  in_progress: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  delivered: 'bg-green-500/20 text-green-500 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-500 border-red-500/30',
};

export const SALE_STATUSES: SaleStatus[] = ['pending', 'in_progress', 'delivered', 'cancelled'];

export interface Sale {
  id: string;
  organization_id: string;
  proposal_id: string | null;
  lead_id: string | null;
  status: SaleStatus;
  total_value: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleWithDetails extends Sale {
  lead?: {
    name: string;
    email: string;
    phone: string;
  } | null;
  proposal?: {
    id: string;
    proposal_date: string;
  } | null;
}
