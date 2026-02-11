// Proposal Types for Senvia OS

export type ProposalStatus = 'draft' | 'sent' | 'negotiating' | 'accepted' | 'rejected' | 'expired';
export type ProposalType = 'energia' | 'servicos';
export type ModeloServico = 'transacional' | 'saas';
export type NegotiationType = 'angariacao' | 'angariacao_indexado' | 'renovacao' | 'sem_volume';

export interface Product {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  price: number | null;
  is_active: boolean;
  is_recurring: boolean;
  tax_value?: number | null;
  tax_exemption_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  organization_id: string;
  code?: string | null;
  client_id?: string | null;
  lead_id?: string | null; // Mantido para retrocompatibilidade
  total_value: number;
  status: ProposalStatus;
  notes?: string | null;
  proposal_date: string;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  
  // Campos por tipo de proposta
  proposal_type?: ProposalType | null;
  negotiation_type?: NegotiationType | null;
  
  // Campos Energia (legacy - agora por CPE)
  consumo_anual?: number | null;
  margem?: number | null;
  dbl?: number | null;
  anos_contrato?: number | null;
  
  // Campos Serviços
  modelo_servico?: ModeloServico | null;
  kwp?: number | null;
  servicos_produtos?: string[] | null; // Fixed products checkboxes
  
  // Comum
  comissao?: number | null;
  
  products?: ProposalProduct[];
  client?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  };
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

export const PROPOSAL_TYPE_LABELS: Record<ProposalType, string> = {
  energia: 'Energia',
  servicos: 'Outros Serviços',
};

export const MODELO_SERVICO_LABELS: Record<ModeloServico, string> = {
  transacional: 'Transacional',
  saas: 'SAAS',
};

export const NEGOTIATION_TYPE_LABELS: Record<NegotiationType, string> = {
  angariacao: 'Angariação',
  angariacao_indexado: 'Angariação Indexado',
  renovacao: 'Renovação',
  sem_volume: 'Sem Volume',
};

export const NEGOTIATION_TYPES: NegotiationType[] = ['angariacao', 'angariacao_indexado', 'renovacao', 'sem_volume'];

// Produtos fixos para Outros Serviços (telecom)
export const SERVICOS_PRODUCTS = [
  'Solar',
  'Carregadores/Baterias',
  'Condensadores',
  'Coberturas',
];
