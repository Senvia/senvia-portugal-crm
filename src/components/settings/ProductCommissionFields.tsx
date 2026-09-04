import { Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CommissionSplitsEditor } from './CommissionSplitsEditor';
import { QuantityTiersEditor } from './QuantityTiersEditor';
import type { Operator } from '@/hooks/useOperators';
import type { CatalogProduct, CommissionSplit, QuantityTier } from '@/types/proposals';
import { deriveCommissionFields } from '@/types/proposals';

const NO_OPERATOR = '__none__';

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
  const isTiered = !!operator && !!operator.commission_basis;
  const scopeLabel = operator?.commission_basis === 'monthly_volume'
    ? (operator.volume_scope === 'org_total' ? 'volume mensal da organização' : 'volume mensal do vendedor')
    : 'nesta venda';
  return { operator, isTiered, scopeLabel };
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
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground h-4 flex items-center gap-1.5">Preço Base (€)</Label>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={product.price || ''}
        onChange={(e) => onChange({ price: parseFloat(e.target.value) || 0 })}
        onBlur={() => onCommit({})}
        placeholder="0.00"
        className="h-9"
      />
    </div>
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
      <Label className="text-xs text-muted-foreground h-4 flex items-center gap-1.5">
        Cartões incluídos
      </Label>
      <Input
        type="number"
        step="1"
        min="0"
        value={product.included_cards ?? ''}
        onChange={(e) => onChange({ included_cards: parseInt(e.target.value, 10) || 0 })}
        onBlur={() => onCommit({})}
        placeholder="1"
        className="h-9"
      />
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
      <Label className="text-xs text-muted-foreground h-4 flex items-center gap-1.5">
        Comissão por cartão extra (€)
      </Label>
      <Input
        type="number"
        step="0.01"
        min="0"
        value={product.extra_card_commission || ''}
        onChange={(e) => onChange({ extra_card_commission: parseFloat(e.target.value) || 0 })}
        onBlur={() => onCommit({})}
        placeholder="0.00"
        className="h-9"
      />
      <p className="text-[11px] text-muted-foreground">
        Deixe em branco se este produto não permitir cartões extra. Quando preenchido, a venda passa a
        pedir quantos cartões extra (com portabilidade / novos) foram vendidos, e cada um soma este valor.
      </p>
    </div>
  );
}

export function CommissionSection({
  product,
  operator,
  isTiered,
  scopeLabel,
  members,
  profiles,
  onChange,
  onCommit,
}: {
  product: CatalogProduct;
  operator: Operator | null;
  isTiered: boolean;
  scopeLabel: string;
  members: Member[];
  profiles: Profile[];
  onChange: (updates: Partial<CatalogProduct>) => void;
  onCommit: (updates: Partial<CatalogProduct>) => void;
}) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Comissão</Label>

      {operator?.kind === 'energia' && !isTiered ? (
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
        />
      ) : (
        <CommissionSplitsEditor
          splits={product.splits ?? []}
          members={members}
          profiles={profiles}
          onChange={(splits: CommissionSplit[]) => onChange({ splits, ...deriveCommissionFields(splits) })}
          onCommit={(splits: CommissionSplit[]) => onCommit({ splits, ...deriveCommissionFields(splits) })}
        />
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
export function ProductCommissionFields({
  product,
  operators,
  members,
  profiles,
  onChange,
  onCommit,
}: ProductCommissionFieldsProps) {
  const { operator, isTiered, scopeLabel } = useProductOperatorContext(product, operators);

  return (
    <>
      <div className={isTiered ? 'max-w-xs' : 'grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl'}>
        <OperatorField product={product} operators={operators} onCommit={onCommit} />
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
        scopeLabel={scopeLabel}
        members={members}
        profiles={profiles}
        onChange={onChange}
        onCommit={onCommit}
      />
    </>
  );
}
