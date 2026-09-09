import { Radio, Cable, Plus, Banknote, Tag, Wallet, CreditCard, Tags } from 'lucide-react';
import { TonedField, tonedInputClass } from './FieldTone';
import { Toggle } from '@/components/ui/toggle';
import { useProductTypes } from '@/hooks/useProductTypes';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CommissionSplitsEditor } from './CommissionSplitsEditor';
import { QuantityTiersEditor } from './QuantityTiersEditor';
import type { Operator } from '@/hooks/useOperators';
import type { CatalogProduct, CommissionSplit, QuantityTier, TelecomTechnology } from '@/types/proposals';
import {
  deriveCommissionFields,
  productNeedsTechnologyChoice,
  TELECOM_TECHNOLOGIES,
  TELECOM_TECHNOLOGY_LABELS,
} from '@/types/proposals';

const NO_OPERATOR = '__none__';
// Radix Select needs a non-empty value for every option.
const NO_TECHNOLOGY = '__none__';
const BOTH_TECHNOLOGIES = '__both__';

interface Member {
  user_id: string;
  full_name: string;
}

interface Profile {
  id: string;
  name: string;
}

/**
 * Resolves the linked operator and what that means for the commission editor
 * below. A fixed commission_basis (per_sale/monthly_volume) wins regardless
 * of kind — an energia operator can opt out of Matriz de Comissões and use
 * the same escalões editor as telecom. A product that doesn't actually vary
 * by quantity just gets ONE band covering everything (min 1, max ∞) — same
 * editor, same mechanism, no separate "flat commission" mode to maintain.
 */
export function useProductOperatorContext(product: CatalogProduct, operators: Operator[]) {
  const operator = operators.find(o => o.id === product.operator_id) ?? null;
  // An operator can MANDATE bands (Digi resolves them off the monthly
  // volume). Every other product may opt in per product — a band is just a
  // quantity range, and "the operator pays 70 € for one and 200 € for three"
  // is as true of a product with no operator attached as of a Digi one.
  const operatorRequiresTiers = !!operator && !!operator.commission_basis;
  const hasTiers = (product.quantity_tiers?.length ?? 0) > 0;
  const isTiered = operatorRequiresTiers || hasTiers;
  const scopeLabel = operator?.commission_basis === 'monthly_volume'
    ? (operator.volume_scope === 'org_total' ? 'volume mensal da organização' : 'volume mensal do vendedor')
    : 'nesta venda';
  return { operator, isTiered, operatorRequiresTiers, scopeLabel };
}

export function OperatorField({
  product,
  operators,
  onCommit,
}: {
  product: CatalogProduct;
  operators: Operator[];
  onCommit: (updates: Partial<CatalogProduct>) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground h-4 flex items-center gap-1.5">
        <Radio className="h-3 w-3 shrink-0" /> Operadora
      </Label>
      <Select
        value={product.operator_id ?? NO_OPERATOR}
        onValueChange={(v) => onCommit({ operator_id: v === NO_OPERATOR ? undefined : v })}
      >
        <SelectTrigger className="h-9"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_OPERATOR}>Nenhuma</SelectItem>
          {operators.map(op => (
            <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PriceField({
  product,
  onChange,
  onCommit,
}: {
  product: CatalogProduct;
  onChange: (updates: Partial<CatalogProduct>) => void;
  onCommit: (updates: Partial<CatalogProduct>) => void;
}) {
  return (
    <TonedField tone="price" icon={<Tag className="h-3 w-3 shrink-0" />} label="Preço Base (€)">
      <Input
        type="number"
        step="0.01"
        min="0"
        value={product.price || ''}
        onChange={(e) => onChange({ price: parseFloat(e.target.value) || 0 })}
        onBlur={() => onCommit({})}
        placeholder="0.00"
        className={cn(tonedInputClass, 'w-full')}
      />
    </TonedField>
  );
}

/**
 * How many SIM cards one unit of this product already includes — e.g. a "2P"
 * package includes 2, while Alarme or Energia Residencial include 0. Rolled
 * up with the extra cards sold on the same line (see ExtraCardField) into
 * the client's total card count on their profile. Left blank, most products
 * count as 0 cards; a product priced by quantity (escalões) still defaults
 * to 1 per unit, matching how it always counted before this field existed.
 */
export function IncludedCardsField({
  product,
  onChange,
  onCommit,
}: {
  product: CatalogProduct;
  onChange: (updates: Partial<CatalogProduct>) => void;
  onCommit: (updates: Partial<CatalogProduct>) => void;
}) {
  return (
    <div className="space-y-1.5 max-w-xs">
      <TonedField tone="cards" icon={<CreditCard className="h-3 w-3 shrink-0" />} label="Cartões incluídos">
        <Input
          type="number"
          step="1"
          min="0"
          value={product.included_cards ?? ''}
          onChange={(e) => onChange({ included_cards: parseInt(e.target.value, 10) || 0 })}
          onBlur={() => onCommit({})}
          placeholder="1"
          className={cn(tonedInputClass, 'w-full')}
        />
      </TonedField>
      <p className="text-[11px] text-muted-foreground">
        Quantos cartões já vêm incluídos em cada unidade vendida deste produto. Deixe em branco se este produto não representa cartões (ex.: Alarme, Energia).
        Soma-se aos cartões extra da venda para o total no perfil do cliente.
      </p>
    </div>
  );
}

/**
 * Flat commission per extra SIM card added on top of the ones the package
 * already includes — e.g. a Vodafone package with 2 included cards pays
 * +10€ for each additional one, ported or brand new. Absent/0 means this
 * product doesn't offer extra cards at all (the fields don't show on the
 * sale screen). Independent of the commission model above it — applies the
 * same whether the base commission is flat splits or escalões.
 */
export function ExtraCardField({
  product,
  onChange,
  onCommit,
}: {
  product: CatalogProduct;
  onChange: (updates: Partial<CatalogProduct>) => void;
  onCommit: (updates: Partial<CatalogProduct>) => void;
}) {
  return (
    <div className="space-y-1.5 max-w-xs">
      <TonedField tone="commission" icon={<Wallet className="h-3 w-3 shrink-0" />} label="Comissão por cartão extra (€)">
        <Input
          type="number"
          step="0.01"
          min="0"
          value={product.extra_card_commission || ''}
          onChange={(e) => onChange({ extra_card_commission: parseFloat(e.target.value) || 0 })}
          onBlur={() => onCommit({})}
          placeholder="0.00"
          className={cn(tonedInputClass, 'w-full')}
        />
      </TonedField>
      <p className="text-[11px] text-muted-foreground">
        Deixe em branco se este produto não permitir cartões extra. Quando preenchido, a venda passa a
        pedir quantos cartões extra (com portabilidade / novos) foram vendidos, e cada um soma este valor.
      </p>
    </div>
  );
}

/**
 * Which technologies this product can be sold as. Picking both is what turns
 * every commission line into two rates — the operator pays differently for a
 * fibre install than for a satellite one, and so does the seller's cut.
 */
export function TechnologyField({
  product,
  onCommit,
}: {
  product: CatalogProduct;
  onCommit: (updates: Partial<CatalogProduct>) => void;
}) {
  const current = product.technologies ?? [];
  const value = current.length === 0 ? NO_TECHNOLOGY
    : current.length > 1 ? BOTH_TECHNOLOGIES
    : current[0];

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground h-4 flex items-center gap-1.5">
        <Cable className="h-3 w-3 shrink-0" /> Tecnologia
      </Label>
      <Select
        value={value}
        onValueChange={(v) => onCommit({
          technologies: v === NO_TECHNOLOGY ? undefined
            : v === BOTH_TECHNOLOGIES ? [...TELECOM_TECHNOLOGIES]
            : [v as TelecomTechnology],
        })}
      >
        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={NO_TECHNOLOGY}>Não se aplica</SelectItem>
          {TELECOM_TECHNOLOGIES.map((t) => (
            <SelectItem key={t} value={t}>{TELECOM_TECHNOLOGY_LABELS[t]}</SelectItem>
          ))}
          <SelectItem value={BOTH_TECHNOLOGIES}>Ambas</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * What the operator pays the org per unit — the number the org's margin is
 * measured against. It had no field until now: the only way to set it was to
 * run SQL by hand. Only for products without escalões; a tiered product sets
 * it per band, where the operator's rate actually moves.
 */
export function OperatorPaysField({
  product,
  onChange,
  onCommit,
}: {
  product: CatalogProduct;
  onChange: (updates: Partial<CatalogProduct>) => void;
  onCommit: (updates: Partial<CatalogProduct>) => void;
}) {
  const byTech = productNeedsTechnologyChoice(product.technologies);
  const fields: { key: 'operator_pays' | 'operator_pays_fibra' | 'operator_pays_satelite'; label: string }[] =
    byTech
      ? [
          { key: 'operator_pays_fibra', label: `Operadora paga — ${TELECOM_TECHNOLOGY_LABELS.fibra} (€)` },
          { key: 'operator_pays_satelite', label: `Operadora paga — ${TELECOM_TECHNOLOGY_LABELS.satelite} (€)` },
        ]
      : [{ key: 'operator_pays', label: 'Operadora paga (€)' }];

  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {fields.map((f) => (
          <TonedField
            key={f.key}
            tone="operator"
            icon={<Banknote className="h-3 w-3 shrink-0" />}
            label={f.label}
            className="max-w-xs"
          >
            <Label className="text-xs text-muted-foreground h-4 flex items-center gap-1.5">{f.label}</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={product[f.key] ?? ''}
              onChange={(e) => onChange({ [f.key]: e.target.value ? parseFloat(e.target.value) : undefined })}
              onBlur={() => onCommit({})}
              placeholder="0.00"
              className={cn(tonedInputClass, 'w-full')}
            />
          </TonedField>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Quanto a operadora paga à organização por unidade. A comissão do vendedor sai daqui; o que sobra
        é o Valor da Organização. Em branco, a venda não sabe dizer quanto fica para a empresa.
      </p>
    </div>
  );
}

export function CommissionSection({
  product,
  operator,
  isTiered,
  operatorRequiresTiers,
  scopeLabel,
  members,
  profiles,
  onChange,
  onCommit,
}: {
  product: CatalogProduct;
  operator: Operator | null;
  isTiered: boolean;
  operatorRequiresTiers: boolean;
  scopeLabel: string;
  members: Member[];
  profiles: Profile[];
  onChange: (updates: Partial<CatalogProduct>) => void;
  onCommit: (updates: Partial<CatalogProduct>) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Comissão</Label>

      {/* Only an UNCLASSIFIED product of an energy operator still goes to the
          Matriz. Once it carries a type, the type's shape wins — Energia and
          Gás are "the operator pays X, the seller gets Y", like fibre. */}
      {operator?.kind === 'energia' && !isTiered && !(product.type_ids?.length) ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          Este produto usa a operadora <strong>{operator.name}</strong> (energia) — a comissão configura-se em
          Matriz de Comissões, não aqui.
        </div>
      ) : isTiered ? (
        <QuantityTiersEditor
          tiers={product.quantity_tiers ?? []}
          members={members}
          profiles={profiles}
          basePrice={product.price}
          scopeLabel={scopeLabel}
          onChange={(quantity_tiers: QuantityTier[]) => onChange({ quantity_tiers })}
          onCommit={(quantity_tiers: QuantityTier[]) => onCommit({ quantity_tiers })}
          technologies={product.technologies}
        />
      ) : (
        <CommissionSplitsEditor
          splits={product.splits ?? []}
          members={members}
          profiles={profiles}
          onChange={(splits: CommissionSplit[]) => onChange({ splits, ...deriveCommissionFields(splits) })}
          onCommit={(splits: CommissionSplit[]) => onCommit({ splits, ...deriveCommissionFields(splits) })}
          technologies={product.technologies}
        />
      )}

      {!isTiered && <OperatorPaysField product={product} onChange={onChange} onCommit={onCommit} />}

      {/* Opting a plain product into quantity bands. The first band inherits
          everything already configured, so nothing has to be retyped and the
          product keeps paying exactly what it paid a second ago. */}
      {!isTiered && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => onCommit({
            quantity_tiers: [{
              id: crypto.randomUUID(),
              min: 1,
              max: null,
              price: product.price,
              operator_pays: product.operator_pays,
              operator_pays_fibra: product.operator_pays_fibra,
              operator_pays_satelite: product.operator_pays_satelite,
              splits: product.splits ?? [],
            }],
          })}
        >
          <Plus className="h-3 w-3 mr-1" />
          Comissão por escalão de quantidade
        </Button>
      )}
      {isTiered && !operatorRequiresTiers && (
        <p className="text-[11px] text-muted-foreground">
          Este produto paga por escalão de quantidade. Apaga todos os escalões para voltar a um valor único.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <IncludedCardsField product={product} onChange={onChange} onCommit={onCommit} />
        <ExtraCardField product={product} onChange={onChange} onCommit={onCommit} />
      </div>
    </div>
  );
}

interface ProductCommissionFieldsProps {
  product: CatalogProduct;
  operators: Operator[];
  members: Member[];
  profiles: Profile[];
  onChange: (updates: Partial<CatalogProduct>) => void;
  onCommit: (updates: Partial<CatalogProduct>) => void;
}

/**
 * Operadora + Preço Base side by side, then the commission editor below.
 * Used as-is by the edit dialog (name isn't editable there, so this order is
 * fine); the create dialog composes OperatorField/PriceField/CommissionSection
 * itself instead, since Nome needs to sit between Operadora and Preço there.
 */
/**
 * Which product types this product belongs to.
 *
 * Multi-select on purpose: a package that carries fibre AND SIM cards is
 * both, and gets paid for both. Two types marked as alternatives (Fibra vs
 * Satélite) may be picked together — the sale then chooses between them.
 */
export function ProductTypesField({
  product,
  onCommit,
}: {
  product: CatalogProduct;
  onCommit: (updates: Partial<CatalogProduct>) => void;
}) {
  const { active, byId } = useProductTypes();
  const selected = new Set(product.type_ids ?? []);
  // An archived type stays visible while this product still carries it.
  const shown = [
    ...active,
    ...(product.type_ids ?? [])
      .filter((id) => !active.some((t) => t.id === id))
      .map((id) => byId.get(id))
      .filter((t): t is NonNullable<typeof t> => !!t),
  ];

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onCommit({ type_ids: [...next] });
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Tags className="h-3.5 w-3.5" />
        Tipos
      </Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {shown.map((t) => {
          const on = selected.has(t.id);
          return (
            <Toggle
              key={t.id}
              size="sm"
              variant="outline"
              pressed={on}
              onPressedChange={() => toggle(t.id)}
              className={cn(
                'h-8 rounded-full px-3 text-xs font-medium',
                on
                  ? 'border-primary/40 bg-primary/10 text-primary data-[state=on]:bg-primary/10 data-[state=on]:text-primary'
                  : 'border-dashed text-muted-foreground',
              )}
            >
              {t.name}
              {t.archived && ' (arquivado)'}
            </Toggle>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        O tipo decide a forma da comissão e é por ele que a venda começa. Um produto pode ter mais do que um —
        um pacote que leve fibra e cartões paga os dois.
      </p>
    </div>
  );
}

export function ProductCommissionFields({
  product,
  operators,
  members,
  profiles,
  onChange,
  onCommit,
}: ProductCommissionFieldsProps) {
  const { operator, isTiered, operatorRequiresTiers, scopeLabel } = useProductOperatorContext(product, operators);

  return (
    <>
      <ProductTypesField product={product} onCommit={onCommit} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <OperatorField product={product} operators={operators} onCommit={onCommit} />
        <TechnologyField product={product} onCommit={onCommit} />
        {!isTiered && <PriceField product={product} onChange={onChange} onCommit={onCommit} />}
      </div>
      {isTiered && (
        <p className="text-xs text-muted-foreground -mt-3">
          O preço passa a definir-se por escalão, abaixo — cada um pode ter o seu próprio valor.
        </p>
      )}
      <CommissionSection
        product={product}
        operator={operator}
        isTiered={isTiered}
        operatorRequiresTiers={operatorRequiresTiers}
        scopeLabel={scopeLabel}
        members={members}
        profiles={profiles}
        onChange={onChange}
        onCommit={onCommit}
      />
    </>
  );
}
