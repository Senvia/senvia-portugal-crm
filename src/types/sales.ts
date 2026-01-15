export type SaleStatus = 'pending' | 'in_progress' | 'delivered' | 'cancelled';

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
