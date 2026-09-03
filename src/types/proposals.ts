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
  // Whether the required paperwork for THIS proposal has been handed in.
  documents_checked?: boolean | null;

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
  // Units sold in this line — only meaningful for a product with quantity_tiers
  // (a telecom operator with commission_basis 'per_sale'/'monthly_volume').
  // Absent/1 for every other product.
  quantidade?: number;
  // Operator this line was sold under, FROZEN when the product was added to
  // the sale. The catalog is live — a product can be moved to another
  // operator later — so reports of "which operators did this client buy
  // from" must read this, not the catalog's current operator_id.
  operator_id?: string;
  operator_name?: string;
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

/**
 * One quantity band for a product linked to a telecom operator whose
 * commission_basis is 'per_sale' or 'monthly_volume' (see operators table).
 * `max: null` means "and above" (the last, open-ended band).
 *
 * 'per_sale' resolves the band from the quantity sold in ONE sale.
 * 'monthly_volume' resolves it from the accumulated monthly quantity (per
 * seller or org-wide, per the operator's volume_scope) — and when a new sale
 * pushes the total into a higher band, every sale that month in scope is
 * RE-resolved to that band, not just the new one.
 */
export interface QuantityTier {
  id: string;
  min: number;
  max: number | null;
  // Overrides the product's base price for units sold in this band (e.g. a
  // Digi line costs 6€ alone, 5,5€ each from 2, 5€ each from 3). Absent
  // falls back to the product's own `price` — most operators don't vary
  // price by quantity, only commission.
  price?: number;
  splits: CommissionSplit[];
  // One-off company-wide reward for REACHING this band (e.g. 15-19 contracts
  // this month earns +300€, 20-24 earns +600€) — added once, not per unit,
  // and shared out among this tier's own `splits` in proportion to their
  // `value`. For a 'monthly_volume' product only the sale that currently
  // carries the group's latest date gets it (server-side); for 'per_sale' it
  // applies to that one sale directly. Absent/0 means no bonus.
  bonus?: number;
  // 'fixed' (default when absent): `bonus` is euros, paid as-is. 'pct':
  // `bonus` is a percentage of the tier's own combined commission (all
  // splits, at the quantity that matched the band) — e.g. 10 units earning
  // 100€ commission with a 50% bonus pays +50€.
  bonus_type?: CommissionType;
}

/**
 * Stable identity for one catalog entry — `name` alone stopped being unique
 * once the same product name can exist once per operator plus once with no
 * operator (see CreateTelecomProductModal). Used wherever the catalog admin
 * screen needs to find/edit/remove "this exact entry", not just "this name".
 */
export function catalogProductKey(product: Pick<CatalogProduct, 'name' | 'operator_id'>): string {
  return `${product.operator_id ?? ''}::${product.name}`;
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
  // Links this product to a row in the `operators` table (Digi, Vodafone...).
  operator_id?: string;
  // Present only when the linked operator has a fixed commission_basis
  // ('per_sale'/'monthly_volume'). When set, this REPLACES `splits` as the
  // source of truth for the product's commission — the matching band's
  // splits are used instead. A product that doesn't actually vary by
  // quantity just gets one band spanning everything (min 1, max ∞).
  quantity_tiers?: QuantityTier[];
}

/**
 * Commission earned for one unit of a catalog product, in euros.
 *
 * `splits` win whenever they exist: they are what the server actually pays
 * out (generate_sale_commission_splits reads them), while has_commission /
 * commission_fixed / commission_pct are a legacy mirror that older catalog
 * entries never had kept in sync — reading those alone showed 0 € for
 * products whose splits pay hundreds.
 *
 * A 'profile' split only pays when the seller holds that profile, which this
 * can't know, so treat the result as the ceiling: the server freezes the real
 * per-person amounts on the sale.
 */
export function getCatalogCommission(product: CatalogProduct): number {
  if (product.splits && product.splits.length > 0) {
    const fixedSum = product.splits.filter(s => s.type === 'fixed').reduce((sum, s) => sum + (s.value || 0), 0);
    const pctSum = product.splits.filter(s => s.type === 'pct').reduce((sum, s) => sum + (s.value || 0), 0);
    return fixedSum + Math.round(product.price * pctSum) / 100;
  }
  if (!product.has_commission) return 0;
  const fixedPart = product.commission_fixed ?? 0;
  const pctPart = Math.round(product.price * (product.commission_pct ?? 0)) / 100;
  return fixedPart + pctPart;
}

/**
 * Commission for `quantity` units of a catalog product. When the product has
 * quantity_tiers (an operator with commission_basis 'per_sale' or
 * 'monthly_volume'), the whole quantity is resolved against ONE band — the
 * band's splits are a per-unit rate, so the total is per-unit × quantity, not
 * graduated like a tax bracket. Falls back to getCatalogCommission (quantity
 * implicitly 1) for a product with no tiers.
 *
 * For 'monthly_volume' operators this is only a same-sale ESTIMATE: the real
 * band (and whether earlier sales this month get re-resolved to it) is
 * decided server-side from the accumulated monthly total, not from this
 * sale's quantity alone.
 */
export function getCatalogCommissionForQuantity(product: CatalogProduct, quantity: number): number {
  const tiers = product.quantity_tiers;
  if (!tiers || tiers.length === 0) return getCatalogCommission(product);

  const qty = Math.max(1, Math.round(quantity || 1));
  const tier = tiers.find(t => qty >= t.min && (t.max == null || qty <= t.max));
  if (!tier) return 0;

  const unitPrice = tier.price ?? product.price;
  const fixedPerUnit = tier.splits.filter(s => s.type === 'fixed').reduce((sum, s) => sum + (s.value || 0), 0);
  const pctPerUnit = tier.splits.filter(s => s.type === 'pct').reduce((sum, s) => sum + (s.value || 0), 0);
  const perUnit = fixedPerUnit + Math.round(unitPrice * pctPerUnit) / 100;
  const base = perUnit * qty;
  // The bonus is a flat, once-off reward for reaching the band, not a
  // per-unit rate — added once, never multiplied by quantity. 'pct' is a
  // percentage of `base` (the tier's own combined commission at this
  // quantity). For 'monthly_volume' this is only an ESTIMATE (same caveat as
  // above): the real value is awarded to a single sale server-side, computed
  // against the group's accumulated quantity, not this one.
  const bonusAmount = tier.bonus_type === 'pct' ? (base * (tier.bonus || 0)) / 100 : (tier.bonus || 0);
  return Math.round((base + bonusAmount) * 100) / 100;
}

/** Euro value of one split, at a given unit price ('pct' is % of that price). */
function splitEuroValue(split: CommissionSplit, unitPrice: number): number {
  return split.type === 'fixed' ? (split.value || 0) : Math.round(unitPrice * (split.value || 0)) / 100;
}

function isMySplit(split: CommissionSplit, userId?: string | null, profileId?: string | null): boolean {
  return (split.kind === 'user' && !!userId && split.user_id === userId)
    || (split.kind === 'profile' && !!profileId && split.profile_id === profileId);
}

/**
 * Commission for ONE unit of a flat (non-tiered) catalog product that
 * actually lands with `userId`/`profileId` — the seller's own cut out of the
 * pool `getCatalogCommission` totals, not everyone else's share too.
 *
 * A legacy product with no `splits` (only the has_commission/commission_pct
 * scalar mirror) carries no recipient info at all, so there is no "mine" to
 * compute — returns 0 rather than guessing the whole thing is the seller's.
 */
export function getCatalogCommissionForUser(
  product: CatalogProduct,
  userId?: string | null,
  profileId?: string | null,
): number {
  if (!product.splits || product.splits.length === 0) return 0;
  const mine = product.splits.filter(s => isMySplit(s, userId, profileId));
  const fixedSum = mine.filter(s => s.type === 'fixed').reduce((sum, s) => sum + (s.value || 0), 0);
  const pctSum = mine.filter(s => s.type === 'pct').reduce((sum, s) => sum + (s.value || 0), 0);
  return fixedSum + Math.round(product.price * pctSum) / 100;
}

/**
 * Same as `getCatalogCommissionForQuantity`, but only the seller's own share
 * of the tier's splits — including their proportional slice of the tier's
 * Bónus Geral (shared exactly like the server does: in proportion to each
 * recipient's own per-unit euro value, not split evenly).
 */
export function getCatalogCommissionForQuantityForUser(
  product: CatalogProduct,
  quantity: number,
  userId?: string | null,
  profileId?: string | null,
): number {
  const tiers = product.quantity_tiers;
  if (!tiers || tiers.length === 0) return getCatalogCommissionForUser(product, userId, profileId);

  const qty = Math.max(1, Math.round(quantity || 1));
  const tier = tiers.find(t => qty >= t.min && (t.max == null || qty <= t.max));
  if (!tier) return 0;

  const unitPrice = tier.price ?? product.price;
  const totalPerUnit = tier.splits.reduce((sum, s) => sum + splitEuroValue(s, unitPrice), 0);
  const myPerUnit = tier.splits
    .filter(s => isMySplit(s, userId, profileId))
    .reduce((sum, s) => sum + splitEuroValue(s, unitPrice), 0);
  if (myPerUnit <= 0) return 0;

  const myBase = myPerUnit * qty;
  const totalBase = totalPerUnit * qty;
  const totalBonus = tier.bonus_type === 'pct' ? (totalBase * (tier.bonus || 0)) / 100 : (tier.bonus || 0);
  const myBonusShare = totalBase > 0 ? totalBonus * (myBase / totalBase) : 0;

  return Math.round((myBase + myBonusShare) * 100) / 100;
}

/**
 * Unit price for `quantity` units of a catalog product — the matching
 * band's own price when the product has quantity_tiers (e.g. a Digi line is
 * 6€ alone, 5€ each from 3), else the product's flat price. Multiply by
 * quantity yourself for a line total.
 */
export function getCatalogPriceForQuantity(product: CatalogProduct, quantity: number): number {
  const tiers = product.quantity_tiers;
  if (!tiers || tiers.length === 0) return product.price;

  const qty = Math.max(1, Math.round(quantity || 1));
  const tier = tiers.find(t => qty >= t.min && (t.max == null || qty <= t.max));
  return tier?.price ?? product.price;
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
