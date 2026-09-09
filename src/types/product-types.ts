/**
 * Product types for the telecom catalog — Cartões, Energia, Gás, Fibra,
 * Satélite, and whatever else an organization sells.
 *
 * A catalog product belongs to one or more types, and the TYPE decides the
 * shape of its commission: quantity bands for cards, "the operator pays X and
 * we pay the seller Y" for energy and gas, a cut of the fibre rate for
 * satellite. The numbers stay on the product; the type only says which fields
 * it has.
 *
 * Two types in the same `exclusive_group` are alternatives — Fibra and
 * Satélite are the same service delivered two ways, so a sale picks one and
 * only that one pays. Types in no group are additive: a product that sells
 * fibre AND cards pays both.
 */

/** Which commission form a product shows for a given type. */
export type CommissionShape =
  /** What the operator pays, minus what the seller takes. Fibre, energy, gas. */
  | 'operator_seller'
  /** Quantity bands, the way Digi pays for cards. */
  | 'tiers'
  /** A percentage of what the same line pays on its fibre type. */
  | 'satellite_of_fibre';

export const COMMISSION_SHAPE_LABELS: Record<CommissionShape, string> = {
  operator_seller: 'Operadora paga + comissão',
  tiers: 'Escalões por quantidade',
  satellite_of_fibre: '% do valor da fibra',
};

export const COMMISSION_SHAPE_HINTS: Record<CommissionShape, string> = {
  operator_seller: 'Diz-se quanto a operadora paga por unidade e quanto fica para quem vende. A diferença é da organização.',
  tiers: 'A comissão muda com a quantidade vendida: 1 unidade paga um valor, 3 pagam outro.',
  satellite_of_fibre: 'Paga uma percentagem do que a mesma linha pagaria em fibra, dos dois lados — operadora e vendedor.',
};

export const COMMISSION_SHAPES: CommissionShape[] = ['operator_seller', 'tiers', 'satellite_of_fibre'];

export interface ProductType {
  id: string;
  name: string;
  shape: CommissionShape;
  /**
   * Types sharing a group are alternatives to each other: a sale picks one.
   * Absent means the type is additive and always applies.
   */
  exclusive_group?: string;
  /** Kept for products already classified under it, hidden from new ones. */
  archived?: boolean;
}

/** The group Fibra and Satélite share — the access technology of a contract. */
export const ACCESS_GROUP = 'acesso';

/**
 * What a telecom organization starts with. Seeded on first use rather than
 * written on sign-up, so an org that never opens the screen carries no config.
 */
export const DEFAULT_PRODUCT_TYPES: ProductType[] = [
  { id: 'fibra', name: 'Fibra', shape: 'operator_seller', exclusive_group: ACCESS_GROUP },
  { id: 'satelite', name: 'Satélite', shape: 'satellite_of_fibre', exclusive_group: ACCESS_GROUP },
  { id: 'cartoes', name: 'Cartões', shape: 'tiers' },
  { id: 'energia', name: 'Energia', shape: 'operator_seller' },
  { id: 'gas', name: 'Gás', shape: 'operator_seller' },
];

/** True when picking this type rules out the others in its group. */
export function isExclusive(type: ProductType): boolean {
  return !!type.exclusive_group;
}

/**
 * The types a sale must choose between, out of the ones a product carries:
 * one entry per exclusive group that has more than one option. A product on
 * Fibra + Satélite + Cartões asks only about Fibra vs Satélite.
 */
export function exclusiveChoicesFor(types: ProductType[]): Record<string, ProductType[]> {
  const groups: Record<string, ProductType[]> = {};
  for (const t of types) {
    if (!t.exclusive_group) continue;
    (groups[t.exclusive_group] ??= []).push(t);
  }
  for (const key of Object.keys(groups)) {
    if (groups[key].length < 2) delete groups[key];
  }
  return groups;
}
