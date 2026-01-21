import { Lead } from "@/types";

export type ClientStatus = 'active' | 'inactive' | 'vip';
export type ClientSource = 'lead' | 'referral' | 'direct' | 'website' | 'other';

export interface CrmClient {
  id: string;
  organization_id: string;
  code?: string | null;
  lead_id?: string | null;
  assigned_to?: string | null;
  
  // Basic info
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  nif?: string | null;
  
  // Address
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  
  status: ClientStatus;
  source?: string | null;
  notes?: string | null;
  
  total_proposals: number;
  total_sales: number;
  total_value: number;
  
  created_at: string;
  updated_at: string;
  
  // Relations
  lead?: Lead | null;
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  vip: 'VIP',
};

export const CLIENT_STATUS_STYLES: Record<ClientStatus, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  inactive: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted' },
  vip: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
};

export const CLIENT_SOURCE_LABELS: Record<string, string> = {
  lead: 'Lead Convertido',
  referral: 'Indicação',
  direct: 'Contacto Direto',
  website: 'Website',
  other: 'Outro',
};
