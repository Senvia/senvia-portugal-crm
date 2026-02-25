import { useState, useEffect } from 'react';
import { Calculator, Info, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization, useUpdateOrganization } from '@/hooks/useOrganization';
import { SERVICOS_PRODUCTS } from '@/types/proposals';
import type { CommissionMatrix, CommissionRule, SolarTier } from '@/hooks/useCommissionMatrix';

const METHOD_LABELS: Record<string, string> = {
  tiered_kwp: 'Escalões por kWp',
  base_plus_per_kwp: 'Base + Taxa/kWp',
  percentage_valor: '% do Valor',
  per_kwp: 'EUR / kWp',
  fixed: 'Valor Fixo (€)',
  manual: 'Manual',
};

const ALL_METHODS = ['tiered_kwp', 'base_plus_per_kwp', 'percentage_valor', 'per_kwp', 'fixed', 'manual'] as const;

const DEFAULT_TIER: SolarTier = { kwpMin: 0, kwpMax: 0, baseTransaccional: 0, adicTransaccional: 0, baseAas: 0, adicAas: 0 };

function getFormulaPreview(rule: CommissionRule): string {
  switch (rule.method) {
    case 'tiered_kwp':
      return `Comissão = Base + (kWp - kWpMin) × Adicional (por escalão, Transaccional ou AAS)`;
    case 'base_plus_per_kwp':
      return `Comissão = ${rule.base}€ + (${rule.ratePerKwp}€ × kWp)`;
    case 'percentage_valor':
      return `Comissão = Valor × ${rule.rate}%`;
    case 'per_kwp':
      return `Comissão = kWp × ${rule.rate}€`;
    case 'fixed':
      return `Comissão = ${rule.rate}€ (fixo)`;
    case 'manual':
      return 'Preenchimento manual';
  }
}

function getDefaultRule(method: string): CommissionRule {
  switch (method) {
    case 'tiered_kwp': return { method: 'tiered_kwp', tiers: [] };
    case 'base_plus_per_kwp': return { method: 'base_plus_per_kwp', base: 0, ratePerKwp: 0 };
    case 'percentage_valor': return { method: 'percentage_valor', rate: 0 };
    case 'per_kwp': return { method: 'per_kwp', rate: 0 };
    case 'fixed': return { method: 'fixed', rate: 0 };
    default: return { method: 'manual' };
  }
}

export function CommissionMatrixTab() {
  const { data: org } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const [localMatrix, setLocalMatrix] = useState<CommissionMatrix>({});

  useEffect(() => {
    const saved = (org as any)?.commission_matrix as CommissionMatrix | null;
    const initial: CommissionMatrix = {};
    SERVICOS_PRODUCTS.forEach((p) => {
      initial[p] = saved?.[p] ?? { method: 'manual' };
    });
    setLocalMatrix(initial);
  }, [org]);

  const handleMethodChange = (product: string, method: string) => {
    setLocalMatrix((prev) => ({
      ...prev,
      [product]: getDefaultRule(method),
    }));
  };

  const handleSave = () => {
    updateOrg.mutate({ commission_matrix: localMatrix as any });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Matriz de Comissões
          </CardTitle>
          <CardDescription>
            Configure como a comissão é calculada automaticamente para cada produto de Outros Serviços.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {SERVICOS_PRODUCTS.map((product) => {
            const rule = localMatrix[product] ?? { method: 'manual' as const };
            return (
              <ProductRuleEditor
                key={product}
                product={product}
                rule={rule}
                onMethodChange={(m) => handleMethodChange(product, m)}
                onRuleChange={(r) => setLocalMatrix(prev => ({ ...prev, [product]: r }))}
              />
            );
          })}

          <Button onClick={handleSave} disabled={updateOrg.isPending} className="w-full sm:w-auto">
            {updateOrg.isPending ? 'A guardar...' : 'Guardar Matriz'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductRuleEditor({
  product,
  rule,
  onMethodChange,
  onRuleChange,
}: {
  product: string;
  rule: CommissionRule;
  onMethodChange: (method: string) => void;
  onRuleChange: (rule: CommissionRule) => void;
}) {
  return (
    <div className="p-4 rounded-lg border bg-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="font-medium text-sm">{product}</div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Método de Cálculo</Label>
        <Select value={rule.method} onValueChange={onMethodChange}>
          <SelectTrigger className="h-9 max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ALL_METHODS.map((m) => (
              <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tiered kWp (Solar) */}
      {rule.method === 'tiered_kwp' && (
        <TieredEditor rule={rule} onChange={onRuleChange} />
      )}

      {/* Base + Per kWp */}
      {rule.method === 'base_plus_per_kwp' && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Valor Base (€)</Label>
            <Input
              type="number" step="0.01" min="0" className="h-9"
              value={rule.base || ''}
              onChange={(e) => onRuleChange({ ...rule, base: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Taxa por kWp (€)</Label>
            <Input
              type="number" step="0.01" min="0" className="h-9"
              value={rule.ratePerKwp || ''}
              onChange={(e) => onRuleChange({ ...rule, ratePerKwp: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      )}

      {/* Percentage */}
      {rule.method === 'percentage_valor' && (
        <div className="max-w-xs space-y-1.5">
          <Label className="text-xs text-muted-foreground">Percentagem (%)</Label>
          <Input
            type="number" step="0.01" min="0" className="h-9"
            value={rule.rate || ''}
            onChange={(e) => onRuleChange({ ...rule, rate: parseFloat(e.target.value) || 0 })}
          />
        </div>
      )}

      {/* Per kWp */}
      {rule.method === 'per_kwp' && (
        <div className="max-w-xs space-y-1.5">
          <Label className="text-xs text-muted-foreground">Taxa (€/kWp)</Label>
          <Input
            type="number" step="0.01" min="0" className="h-9"
            value={rule.rate || ''}
            onChange={(e) => onRuleChange({ ...rule, rate: parseFloat(e.target.value) || 0 })}
          />
        </div>
      )}

      {/* Fixed */}
      {rule.method === 'fixed' && (
        <div className="max-w-xs space-y-1.5">
          <Label className="text-xs text-muted-foreground">Valor Fixo (€)</Label>
          <Input
            type="number" step="0.01" min="0" className="h-9"
            value={rule.rate || ''}
            onChange={(e) => onRuleChange({ ...rule, rate: parseFloat(e.target.value) || 0 })}
          />
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Info className="h-3 w-3 shrink-0" />
        <span>{getFormulaPreview(rule)}</span>
      </div>
    </div>
  );
}

function TieredEditor({
  rule,
  onChange,
}: {
  rule: { method: 'tiered_kwp'; tiers: SolarTier[] };
  onChange: (rule: CommissionRule) => void;
}) {
  const tiers = rule.tiers || [];

  const updateTier = (index: number, field: keyof SolarTier, value: number) => {
    const newTiers = tiers.map((t, i) => i === index ? { ...t, [field]: value } : t);
    onChange({ ...rule, tiers: newTiers });
  };

  const addTier = () => {
    const lastMax = tiers.length > 0 ? tiers[tiers.length - 1].kwpMax : 0;
    onChange({
      ...rule,
      tiers: [...tiers, { ...DEFAULT_TIER, kwpMin: lastMax }],
    });
  };

  const removeTier = (index: number) => {
    onChange({ ...rule, tiers: tiers.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium text-muted-foreground">Escalões Solar</div>

      {/* Mobile: cards | Desktop: table-like */}
      <div className="space-y-3">
        {tiers.map((tier, idx) => (
          <div key={idx} className="rounded-md border bg-muted/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Escalão {idx + 1}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTier(idx)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TierField label="kWp Min" value={tier.kwpMin} onChange={(v) => updateTier(idx, 'kwpMin', v)} />
              <TierField label="kWp Max" value={tier.kwpMax} onChange={(v) => updateTier(idx, 'kwpMax', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TierField label="Base Trans. (€)" value={tier.baseTransaccional} onChange={(v) => updateTier(idx, 'baseTransaccional', v)} />
              <TierField label="Adic. Trans. (€/kWp)" value={tier.adicTransaccional} onChange={(v) => updateTier(idx, 'adicTransaccional', v)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <TierField label="Base AAS (€)" value={tier.baseAas} onChange={(v) => updateTier(idx, 'baseAas', v)} />
              <TierField label="Adic. AAS (€/kWp)" value={tier.adicAas} onChange={(v) => updateTier(idx, 'adicAas', v)} />
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={addTier} className="gap-1.5">
        <Plus className="h-3.5 w-3.5" />
        Adicionar Escalão
      </Button>
    </div>
  );
}

function TierField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground leading-tight">{label}</Label>
      <Input
        type="number"
        step="0.01"
        min="0"
        className="h-8 text-xs"
        value={value || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}
