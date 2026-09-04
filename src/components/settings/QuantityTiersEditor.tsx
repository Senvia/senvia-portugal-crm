import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { CommissionSplitRow } from './CommissionSplitRow';
import type { CommissionSplit, QuantityTier } from '@/types/proposals';

interface Member {
  user_id: string;
  full_name: string;
}

interface Profile {
  id: string;
  name: string;
}

interface QuantityTiersEditorProps {
  tiers: QuantityTier[];
  members: Member[];
  profiles: Profile[];
  /** Product's flat price — shown as the placeholder when a band has no price override of its own. */
  basePrice: number;
  /** Explains what the quantity is counted against ("nesta venda" or "no mês, por vendedor"...). */
  scopeLabel: string;
  onChange: (tiers: QuantityTier[]) => void;
  onCommit: (tiers: QuantityTier[]) => void;
}

/**
 * Quantity bands for a product linked to a 'per_sale'/'monthly_volume' telecom
 * operator. Each band is one compact row (De/Até + who gets paid + valor) —
 * a band almost always pays one person, so that is the row you see by
 * default; "+ juntar mais alguém" only appears when you actually need a
 * second recipient in the same band, instead of a permanently-visible second
 * "add" button that reads as a sibling of "Adicionar escalão".
 */
export function QuantityTiersEditor({
  tiers,
  members,
  profiles,
  basePrice,
  scopeLabel,
  onChange,
  onCommit,
}: QuantityTiersEditorProps) {
  const addTier = () => {
    const lastMax = tiers.length > 0 ? tiers[tiers.length - 1].max : 0;
    const nextMin = (lastMax ?? 0) + 1;
    onCommit([...tiers, {
      id: crypto.randomUUID(),
      min: nextMin,
      max: null,
      splits: [{ kind: 'user', type: 'fixed', value: 0 }],
    }]);
  };

  const updateTier = (id: string, updates: Partial<QuantityTier>, commit = false) => {
    const next = tiers.map(t => (t.id === id ? { ...t, ...updates } : t));
    if (commit) onCommit(next);
    else onChange(next);
  };

  const removeTier = (id: string) => {
    onCommit(tiers.filter(t => t.id !== id));
  };

  const updateSplit = (tierId: string, index: number, updates: Partial<CommissionSplit>, commit = false) => {
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;
    const nextSplits = tier.splits.map((s, i) => (i === index ? { ...s, ...updates } : s));
    updateTier(tierId, { splits: nextSplits }, commit);
  };

  const addSplit = (tierId: string) => {
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;
    updateTier(tierId, { splits: [...tier.splits, { kind: 'user', type: 'fixed', value: 0 }] }, true);
  };

  const removeSplit = (tierId: string, index: number) => {
    const tier = tiers.find(t => t.id === tierId);
    if (!tier) return;
    updateTier(tierId, { splits: tier.splits.filter((_, i) => i !== index) }, true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">Escalões por quantidade ({scopeLabel})</Label>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={addTier}>
          <Plus className="h-3 w-3 mr-1" />
          Adicionar escalão
        </Button>
      </div>

      {tiers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Sem escalões configurados. Sem eles, nenhuma comissão é gerada para este produto.
        </p>
      ) : (
        <div className="space-y-2">
          {tiers.map((tier) => (
            <div key={tier.id} className="rounded-lg border bg-muted/20 p-2.5 space-y-2">
              <div className="flex items-end gap-2">
                <div className="space-y-1 w-20 shrink-0">
                  <Label className="text-[10px] text-muted-foreground">De (unid.)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={tier.min || ''}
                    onChange={(e) => updateTier(tier.id, { min: parseInt(e.target.value, 10) || 1 })}
                    onBlur={() => onCommit(tiers)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 w-20 shrink-0">
                  <Label className="text-[10px] text-muted-foreground">Até (unid.)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="∞"
                    value={tier.max ?? ''}
                    onChange={(e) => updateTier(tier.id, { max: e.target.value ? parseInt(e.target.value, 10) : null })}
                    onBlur={() => onCommit(tiers)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1 w-24 shrink-0">
                  <Label className="text-[10px] text-muted-foreground">Preço de Venda (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={basePrice ? basePrice.toFixed(2) : '0.00'}
                    value={tier.price ?? ''}
                    onChange={(e) => updateTier(tier.id, { price: e.target.value ? parseFloat(e.target.value) : undefined })}
                    onBlur={() => onCommit(tiers)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex-1" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  title="Eliminar escalão"
                  onClick={() => removeTier(tier.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="ml-1 pl-3 border-l-2 border-border space-y-1.5">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <Label className="text-[10px] font-medium text-foreground">Comissão</Label>
                  <p className="text-xs text-muted-foreground">
                    {tier.max == null
                      ? `A partir de ${tier.min} unidades`
                      : tier.min <= 1
                        ? `Até ${tier.max} unidades`
                        : `De ${tier.min} até ${tier.max} unidades`}
                    {tier.price != null && ` — ${tier.price.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €/unid.`}
                    {!!tier.bonus && (
                      tier.bonus_type === 'pct'
                        ? ` + bónus único de ${tier.bonus.toLocaleString('pt-PT', { minimumFractionDigits: 2 })}% da comissão ao atingir`
                        : ` + bónus único de ${tier.bonus.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} € ao atingir`
                    )}
                  </p>
                </div>
                {tier.splits.length === 0 ? (
                  <>
                    <p className="text-xs text-muted-foreground">Sem comissão — ninguém recebe por este escalão.</p>
                    <BonusField tier={tier} onCommit={() => onCommit(tiers)} updateTier={updateTier} />
                  </>
                ) : (
                  tier.splits.map((split, index) => (
                    <CommissionSplitRow
                      key={index}
                      split={split}
                      members={members}
                      profiles={profiles}
                      showLabels={false}
                      onChange={(updates, commit) => updateSplit(tier.id, index, updates, commit)}
                      onCommit={() => onCommit(tiers)}
                      onRemove={() => removeSplit(tier.id, index)}
                      trailing={index === 0 ? <BonusField tier={tier} onCommit={() => onCommit(tiers)} updateTier={updateTier} /> : undefined}
                    />
                  ))
                )}
                <button
                  type="button"
                  className="text-[11px] font-medium text-primary hover:underline"
                  onClick={() => addSplit(tier.id)}
                >
                  + juntar mais alguém a este escalão
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tier-wide one-off reward — rendered inline on the first commission row (see `trailing` above). */
function BonusField({
  tier,
  updateTier,
  onCommit,
}: {
  tier: QuantityTier;
  updateTier: (id: string, updates: Partial<QuantityTier>, commit?: boolean) => void;
  onCommit: () => void;
}) {
  const bonusType = tier.bonus_type ?? 'fixed';
  return (
    <div className="space-y-1 shrink-0">
      <Label className="text-[10px] text-muted-foreground">Bónus Geral</Label>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          step={bonusType === 'fixed' ? '0.01' : '0.1'}
          min="0"
          max={bonusType === 'pct' ? '100' : undefined}
          placeholder="0"
          value={tier.bonus ?? ''}
          onChange={(e) => updateTier(tier.id, { bonus: e.target.value ? parseFloat(e.target.value) : undefined })}
          onBlur={onCommit}
          className="h-8 w-20 text-xs"
        />
        <div className="flex overflow-hidden rounded-md border shrink-0">
          <button
            type="button"
            onClick={() => updateTier(tier.id, { bonus_type: 'fixed' }, true)}
            className={cn(
              'px-2 py-1 text-[11px] leading-4 transition-colors',
              bonusType === 'fixed' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            €
          </button>
          <button
            type="button"
            onClick={() => updateTier(tier.id, { bonus_type: 'pct' }, true)}
            className={cn(
              'px-2 py-1 text-[11px] leading-4 transition-colors',
              bonusType === 'pct' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            %
          </button>
        </div>
      </div>
    </div>
  );
}
