// Proposal Types for Senvia OS

export type ProposalStatus = 'draft' | 'sent' | 'negotiating' | 'accepted' | 'rejected' | 'expired';
export type ProposalType = 'energia' | 'servicos';
export type ModeloServico = 'transacional' | 'saas';
export type NegotiationType = 'angariacao' | 'angariacao_indexado' | 'renovacao' | 'sem_volume';

export interface Product {
  id: string;
  organization_id: string;
  code?: string | null;
  name: string;
  description?: string | null;
  price: number | null;
  is_active: boolean;
  is_recurring: boolean;
  tax_value?: number | null;
  tax_exemption_reason?: string | null;
  invoicexpress_id?: number | null;
  /** Commission earned per unit sold (telecom / fixed-commission products). */
  commission_value?: number | null;
  /** Commission per unit on renewal. Falls back to commission_value × 0.25. */
  commission_renewal_value?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceImage {
  id: string;
  product_id: string;
  organization_id: string;
  url: string;
  alt_text?: string | null;
  position: number;
  is_primary: boolean;
  created_at: string;
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
  accepted_at?: string | null;
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
  servicos_details?: ServicosDetails | null; // Per-product details JSONB
  
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
  sem_volume: 'Ang sem Volume',
};

export const NEGOTIATION_TYPES: NegotiationType[] = ['angariacao', 'angariacao_indexado', 'renovacao', 'sem_volume'];

// ─── Legacy: Produtos fixos para Outros Serviços (Perfect2Gether) ───
export const SERVICOS_PRODUCTS = [
  'Solar',
  'Baterias',
  'Carregadores',
  'Condensadores',
  'Coberturas',
];

// Detalhes por produto de serviço (legacy format - duracao/valor/kwp/comissao)
export interface ServicosProductDetail {
  duracao?: number;
  valor?: number;
  kwp?: number;
  comissao?: number;
  // New catalog format fields (coexist with legacy)
  name?: string;
  price?: number;
  commission_pct?: number;
  commission_type?: CommissionType;
  commission_fixed?: number;
}

export type ServicosDetails = Record<string, ServicosProductDetail>;

// ─── Legacy config de campos por produto (Perfect2Gether) ───
export interface ServicosProductConfig {
  name: string;
  fields: ('duracao' | 'valor' | 'kwp' | 'comissao')[];
  kwpAuto?: (detail: ServicosProductDetail) => number | null;
}

export const SERVICOS_PRODUCT_CONFIGS: ServicosProductConfig[] = [
  { name: 'Solar', fields: ['duracao', 'kwp', 'comissao'] },
  { name: 'Baterias', fields: ['kwp', 'comissao'] },
  { name: 'Carregadores', fields: ['valor', 'kwp', 'comissao'] },
  { name: 'Condensadores', fields: ['duracao', 'valor', 'kwp', 'comissao'], kwpAuto: (d) => d.valor != null ? d.valor / 1000 : null },
  { name: 'Coberturas', fields: ['valor', 'comissao'] },
];

export const FIELD_LABELS: Record<string, string> = {
  duracao: 'Duração (anos)',
  valor: 'Valor (€)',
  kwp: 'kWp',
  comissao: 'Comissão (€)',
};

// ─── New catalog format (Escolha Inteligente, etc.) ───
export type CommissionType = 'pct' | 'fixed';

/**
 * One line of a product's commission split.
 *
 * kind 'user'    pays the named user.
 * kind 'profile' pays a single person, the seller of the sale, and only when
 *                the seller holds that profile. It is how you say "whoever
 *                sells this earns 30€" without naming anyone.
 *
 * 'pct' values are a percentage of the sale total.
 */
export interface CommissionSplit {
  kind: 'user' | 'profile';
  user_id?: string;
  profile_id?: string;
  type: CommissionType;
  value: number;
}

export interface CatalogProduct {
  name: string;
  price: number;
  has_commission: boolean;
  commission_pct: number;
  // 'fixed' pays commission_fixed euros per unit. Absent means 'pct', so
  // catalogs saved before this option keep behaving exactly as before.
  commission_type?: CommissionType;
  commission_fixed?: number;
  // When set, the sale pays these people instead of a single commission.
  // Amounts are frozen per sale in sale_commission_splits.
  splits?: CommissionSplit[];
}

/** Commission earned for one unit of a catalog product, in euros. */
export function getCatalogCommission(product: CatalogProduct): number {
  if (!product.has_commission) return 0;
  const fixedPart = product.commission_fixed ?? 0;
  const pctPart = Math.round(product.price * (product.commission_pct ?? 0)) / 100;
  return fixedPart + pctPart;
}

/**
 * Derives the legacy scalar commission fields (has_commission, commission_pct,
 * commission_fixed, commission_type) from the splits list, so screens that
 * still read those fields — the sale-creation prefill via getCatalogCommission,
 * mainly — show a sensible number before generate_sale_commission_splits()
 * (see 20260831210000_sale_commission_splits.sql) freezes the real per-person
 * amounts server-side. Splits are the single source of truth the user edits;
 * these fields are just kept in sync automatically.
 */
export function deriveCommissionFields(
  splits: CommissionSplit[],
): Pick<CatalogProduct, 'has_commission' | 'commission_pct' | 'commission_fixed' | 'commission_type'> {
  const fixedSum = splits.filter(s => s.type === 'fixed').reduce((sum, s) => sum + (s.value || 0), 0);
  const pctSum = splits.filter(s => s.type === 'pct').reduce((sum, s) => sum + (s.value || 0), 0);
  return {
    has_commission: splits.length > 0,
    commission_fixed: fixedSum,
    commission_pct: pctSum,
    commission_type: fixedSum > 0 && pctSum === 0 ? 'fixed' : 'pct',
  };
}
