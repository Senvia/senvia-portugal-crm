import { useState, useEffect } from 'react';
import { Calculator, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrganization, useUpdateOrganization } from '@/hooks/useOrganization';
import { SERVICOS_PRODUCTS } from '@/types/proposals';
import type { CommissionMatrix, CommissionRule } from '@/hooks/useCommissionMatrix';

const METHOD_LABELS: Record<CommissionRule['method'], string> = {
  per_kwp: 'EUR / kWp',
  percentage_valor: '% do Valor',
  fixed: 'Valor Fixo (€)',
  manual: 'Manual',
};

const METHOD_OPTIONS: CommissionRule['method'][] = ['per_kwp', 'percentage_valor', 'fixed', 'manual'];

function getFormulaPreview(rule: CommissionRule): string {
  switch (rule.method) {
    case 'per_kwp':
      return `Comissão = kWp × ${rule.rate} €`;
    case 'percentage_valor':
      return `Comissão = Valor × ${rule.rate}%`;
    case 'fixed':
      return `Comissão = ${rule.rate} € (fixo)`;
    case 'manual':
      return 'Preenchimento manual';
  }
}

function getRateLabel(method: CommissionRule['method']): string {
  switch (method) {
    case 'per_kwp': return 'Taxa (€/kWp)';
    case 'percentage_valor': return 'Percentagem (%)';
    case 'fixed': return 'Valor Fixo (€)';
    default: return '';
  }
}

const DEFAULT_RULE: CommissionRule = { method: 'manual', rate: 0 };

export function CommissionMatrixTab() {
  const { data: org } = useOrganization();
  const updateOrg = useUpdateOrganization();

  const [localMatrix, setLocalMatrix] = useState<CommissionMatrix>({});

  useEffect(() => {
    const saved = (org as any)?.commission_matrix as CommissionMatrix | null;
    const initial: CommissionMatrix = {};
    SERVICOS_PRODUCTS.forEach((p) => {
      initial[p] = saved?.[p] ?? { ...DEFAULT_RULE };
    });
    setLocalMatrix(initial);
  }, [org]);

  const handleMethodChange = (product: string, method: CommissionRule['method']) => {
    setLocalMatrix((prev) => ({
      ...prev,
      [product]: { method, rate: method === 'manual' ? 0 : (prev[product]?.rate || 0) },
    }));
  };

  const handleRateChange = (product: string, rate: number) => {
    setLocalMatrix((prev) => ({
      ...prev,
      [product]: { ...prev[product], rate },
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
        <CardContent className="space-y-4">
          {SERVICOS_PRODUCTS.map((product) => {
            const rule = localMatrix[product] ?? DEFAULT_RULE;
            return (
              <div key={product} className="p-4 rounded-lg border bg-card space-y-3">
                <div className="font-medium text-sm">{product}</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Método de Cálculo</Label>
                    <Select
                      value={rule.method}
                      onValueChange={(v) => handleMethodChange(product, v as CommissionRule['method'])}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METHOD_OPTIONS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {METHOD_LABELS[m]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {rule.method !== 'manual' && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">{getRateLabel(rule.method)}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={rule.rate || ''}
                        onChange={(e) => handleRateChange(product, parseFloat(e.target.value) || 0)}
                        className="h-9"
                        placeholder="0"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3 w-3" />
                  <span>{getFormulaPreview(rule)}</span>
                </div>
              </div>
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
