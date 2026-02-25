import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import { Calculator, Info, Plus, Trash2, Sun, Battery, Gauge, Home, Save, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useOrganization, useUpdateOrganization } from '@/hooks/useOrganization';
import { SERVICOS_PRODUCTS } from '@/types/proposals';
import type { CommissionMatrix, CommissionRule, SolarTier } from '@/hooks/useCommissionMatrix';

const METHOD_LABELS: Record<string, string> = {
  tiered_kwp: 'Escalões por kWp',
  base_plus_per_kwp: 'Base + € × kWp',
  formula_percentage: 'Fórmula kWp + %',
  percentage_valor: '% da Venda/Proposta',
};

const ALL_METHODS = ['tiered_kwp', 'base_plus_per_kwp', 'formula_percentage', 'percentage_valor'] as const;

const DEFAULT_TIER: SolarTier = { kwpMin: 0, kwpMax: 0, baseTransaccional: 0, adicTransaccional: 0, baseAas: 0, adicAas: 0 };

const PRODUCT_ICONS: Record<string, React.ElementType> = {
  Solar: Sun,
  Baterias: Battery,
  Carregadores: Battery,
  Condensadores: Gauge,
  Coberturas: Home,
};

function getProductIcon(product: string) {
  for (const [key, Icon] of Object.entries(PRODUCT_ICONS)) {
    if (product.toLowerCase().includes(key.toLowerCase())) return Icon;
  }
  return Calculator;
}

function getFormulaPreview(rule: CommissionRule): string {
  switch (rule.method) {
    case 'tiered_kwp':
      return 'Comissão = Base + (kWp - kWpMin) × Adicional (por escalão, Trans. ou AAS)';
    case 'base_plus_per_kwp':
      return 'Comissão = Base (€) + (€/kWp × kWp da proposta)';
    case 'formula_percentage':
      return 'kWp = (Valor × Factor) / Divisor → Comissão = kWp resultado × %';
    case 'percentage_valor':
      return 'Comissão = Valor da proposta × %';
  }
}

function getDefaultRule(method: string): CommissionRule {
  return { method: method as CommissionRule['method'], tiers: [] };
}

// ─── Main Component ───

export function CommissionMatrixTab() {
  const { data: org } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const [localMatrix, setLocalMatrix] = useState<CommissionMatrix>({});
  const [openProduct, setOpenProduct] = useState<string | null>(null);

  useEffect(() => {
    const saved = (org as any)?.commission_matrix as CommissionMatrix | null;
    const initial: CommissionMatrix = {};
    SERVICOS_PRODUCTS.forEach((p) => {
      const existing = saved?.[p];
      if (existing && !ALL_METHODS.includes(existing.method as any)) {
        initial[p] = { method: 'percentage_valor', tiers: existing.tiers || [] };
      } else {
        initial[p] = existing ?? { method: 'tiered_kwp', tiers: [] };
      }
    });
    setLocalMatrix(initial);
  }, [org]);

  const handleSave = (product: string) => {
    updateOrg.mutate({ commission_matrix: localMatrix as any }, {
      onSuccess: () => setOpenProduct(null),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Matriz de Comissões</h2>
      </div>
      <p className="text-sm text-muted-foreground -mt-4">
        Configure como a comissão é calculada para cada produto. Clique num card para editar.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {SERVICOS_PRODUCTS.map((product) => {
          const rule = localMatrix[product] ?? { method: 'tiered_kwp' as const, tiers: [] };
          const Icon = getProductIcon(product);
          const tierCount = rule.method === 'tiered_kwp' ? (rule.tiers?.length ?? 0) : null;

          return (
            <Card
              key={product}
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setOpenProduct(product)}
            >
              <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                <Icon className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium leading-tight">{product}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {METHOD_LABELS[rule.method] ?? rule.method}
                </Badge>
                {tierCount !== null && (
                  <span className="text-[10px] text-muted-foreground">
                    {tierCount} escalão(ões)
                  </span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {openProduct && (
        <ProductModal
          product={openProduct}
          rule={localMatrix[openProduct] ?? { method: 'tiered_kwp', tiers: [] }}
          onMethodChange={(m) =>
            setLocalMatrix((prev) => ({ ...prev, [openProduct]: getDefaultRule(m) }))
          }
          onRuleChange={(r) =>
            setLocalMatrix((prev) => ({ ...prev, [openProduct]: r }))
          }
          onSave={() => handleSave(openProduct)}
          isSaving={updateOrg.isPending}
          onClose={() => setOpenProduct(null)}
        />
      )}
    </div>
  );
}

// ─── Product Modal ───

function ProductModal({
  product,
  rule,
  onMethodChange,
  onRuleChange,
  onSave,
  isSaving,
  onClose,
}: {
  product: string;
  rule: CommissionRule;
  onMethodChange: (method: string) => void;
  onRuleChange: (rule: CommissionRule) => void;
  onSave: () => void;
  isSaving: boolean;
  onClose: () => void;
}) {
  const Icon = getProductIcon(product);

  const renderEditor = () => {
    switch (rule.method) {
      case 'tiered_kwp':
        return <TieredTableEditor rule={rule} onChange={onRuleChange} />;
      case 'base_plus_per_kwp':
        return <BasePlusKwpEditor rule={rule} onChange={onRuleChange} />;
      case 'formula_percentage':
        return <FormulaPercentageEditor rule={rule} onChange={onRuleChange} />;
      case 'percentage_valor':
        return <PercentageValorEditor rule={rule} onChange={onRuleChange} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent variant="fullScreen" className="flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0 border-b pb-4 px-4 sm:px-6 pt-4">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base sm:text-lg">{product}</DialogTitle>
          </div>
          <DialogDescription>Configure o método de cálculo da comissão.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-6">
          <div className="space-y-1.5 max-w-xs">
            <Label className="text-xs text-muted-foreground">Método de Cálculo</Label>
            <Select value={rule.method} onValueChange={onMethodChange}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{METHOD_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {renderEditor()}

          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span>{getFormulaPreview(rule)}</span>
          </div>
        </div>

        <div className="shrink-0 border-t px-4 sm:px-6 py-3 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={isSaving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {isSaving ? 'A guardar...' : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Base + € × kWp Editor ───

function BasePlusKwpEditor({ rule, onChange }: { rule: CommissionRule; onChange: (r: CommissionRule) => void }) {
  const update = (field: keyof CommissionRule, value: number) => onChange({ ...rule, [field]: value });

  return (
    <div className="space-y-5">
      <div className="text-sm font-medium">Configuração da Fórmula</div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Transacional</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Base (€)</span>
            <DecimalInput className="h-9 w-24" value={rule.baseTrans ?? 0} onChange={(v) => update('baseTrans', v)} />
            <span className="text-sm text-muted-foreground">+</span>
            <span className="text-sm text-muted-foreground">€/kWp</span>
            <DecimalInput className="h-9 w-24" value={rule.ratePerKwpTrans ?? 0} onChange={(v) => update('ratePerKwpTrans', v)} />
            <span className="text-sm text-muted-foreground">×</span>
            <Badge variant="outline" className="text-xs">kWp (auto)</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">AAS</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Base (€)</span>
            <DecimalInput className="h-9 w-24" value={rule.baseAas ?? 0} onChange={(v) => update('baseAas', v)} />
            <span className="text-sm text-muted-foreground">+</span>
            <span className="text-sm text-muted-foreground">€/kWp</span>
            <DecimalInput className="h-9 w-24" value={rule.ratePerKwpAas ?? 0} onChange={(v) => update('ratePerKwpAas', v)} />
            <span className="text-sm text-muted-foreground">×</span>
            <Badge variant="outline" className="text-xs">kWp (auto)</Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Fórmula kWp + % Editor ───

function FormulaPercentageEditor({ rule, onChange }: { rule: CommissionRule; onChange: (r: CommissionRule) => void }) {
  const update = (field: keyof CommissionRule, value: number) => onChange({ ...rule, [field]: value });

  return (
    <div className="space-y-5">
      <div className="text-sm font-medium">Derivação do kWp</div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">kWp =</span>
          <span className="text-sm text-muted-foreground">(</span>
          <Badge variant="outline" className="text-xs">Valor (auto)</Badge>
          <span className="text-sm text-muted-foreground">×</span>
          <DecimalInput className="h-9 w-24" value={rule.factor ?? 0} onChange={(v) => update('factor', v)} />
          <span className="text-sm text-muted-foreground">)</span>
          <span className="text-sm text-muted-foreground">/</span>
          <DecimalInput className="h-9 w-24" value={rule.divisor ?? 0} onChange={(v) => update('divisor', v)} />
        </div>

        <div className="text-sm font-medium pt-2">Comissão</div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Transacional</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Comissão =</span>
            <Badge variant="outline" className="text-xs">kWp resultado</Badge>
            <span className="text-sm text-muted-foreground">×</span>
            <DecimalInput className="h-9 w-20" value={rule.pctTrans ?? 0} onChange={(v) => update('pctTrans', v)} />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">AAS</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground">Comissão =</span>
            <Badge variant="outline" className="text-xs">kWp resultado</Badge>
            <span className="text-sm text-muted-foreground">×</span>
            <DecimalInput className="h-9 w-20" value={rule.pctAas ?? 0} onChange={(v) => update('pctAas', v)} />
            <span className="text-sm text-muted-foreground">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── % da Venda/Proposta Editor ───

function PercentageValorEditor({ rule, onChange }: { rule: CommissionRule; onChange: (r: CommissionRule) => void }) {
  const update = (field: keyof CommissionRule, value: number) => onChange({ ...rule, [field]: value });

  return (
    <div className="space-y-5">
      <div className="text-sm font-medium">Percentagem sobre o Valor</div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Transacional</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">Valor (auto)</Badge>
            <span className="text-sm text-muted-foreground">×</span>
            <DecimalInput className="h-9 w-20" value={rule.pctTrans ?? 0} onChange={(v) => update('pctTrans', v)} />
            <span className="text-sm text-muted-foreground">%</span>
            <span className="text-sm text-muted-foreground">→ Comissão</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">AAS</Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">Valor (auto)</Badge>
            <span className="text-sm text-muted-foreground">×</span>
            <DecimalInput className="h-9 w-20" value={rule.pctAas ?? 0} onChange={(v) => update('pctAas', v)} />
            <span className="text-sm text-muted-foreground">%</span>
            <span className="text-sm text-muted-foreground">→ Comissão</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tiered Table Editor (only for tiered_kwp) ───

interface ColumnDef {
  field: keyof SolarTier;
  label: string;
}

const TIERED_COLUMNS: ColumnDef[] = [
  { field: 'kwpMin', label: 'kWp Min' },
  { field: 'kwpMax', label: 'kWp Max' },
  { field: 'baseTransaccional', label: 'Base Trans. (€)' },
  { field: 'adicTransaccional', label: 'Adic. Trans. (€/kWp)' },
  { field: 'baseAas', label: 'Base AAS (€)' },
  { field: 'adicAas', label: 'Adic. AAS (€/kWp)' },
];

function TieredTableEditor({
  rule,
  onChange,
}: {
  rule: CommissionRule;
  onChange: (rule: CommissionRule) => void;
}) {
  const tiers = rule.tiers || [];
  const fileRef = useRef<HTMLInputElement>(null);

  const updateTier = (index: number, field: keyof SolarTier, value: number) => {
    const newTiers = tiers.map((t, i) => (i === index ? { ...t, [field]: value } : t));
    onChange({ ...rule, tiers: newTiers });
  };

  const addTier = () => {
    const lastMax = tiers.length > 0 ? tiers[tiers.length - 1].kwpMax : 0;
    onChange({ ...rule, tiers: [...tiers, { ...DEFAULT_TIER, kwpMin: lastMax }] });
  };

  const removeTier = (index: number) => {
    onChange({ ...rule, tiers: tiers.filter((_, i) => i !== index) });
  };

  const COLUMN_MAP: Record<string, keyof SolarTier> = {};
  const addMapping = (keys: string[], field: keyof SolarTier) => {
    keys.forEach((k) => { COLUMN_MAP[k.toLowerCase().replace(/[\s._]/g, '')] = field; });
  };
  addMapping(['kWp Min', 'kwpmin', 'kwp_min', 'kwpMin', 'kWpMin'], 'kwpMin');
  addMapping(['kWp Max', 'kwpmax', 'kwp_max', 'kwpMax', 'kWpMax'], 'kwpMax');
  addMapping(['Base Trans', 'Base Trans.', 'base_transaccional', 'baseTransaccional', 'basetrans'], 'baseTransaccional');
  addMapping(['Adic Trans', 'Adic. Trans.', 'Adic Trans.', 'adic_transaccional', 'adicTransaccional', 'adictrans'], 'adicTransaccional');
  addMapping(['Base AAS', 'base_aas', 'baseAas', 'baseaas'], 'baseAas');
  addMapping(['Adic AAS', 'Adic. AAS', 'adic_aas', 'adicAas', 'adicaas'], 'adicAas');

  const resolveField = (header: string): keyof SolarTier | null => {
    const normalized = header.toLowerCase().replace(/[\s._]/g, '');
    return COLUMN_MAP[normalized] ?? null;
  };

  const parseNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const s = String(val).replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  const handleImportFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        if (json.length === 0) { toast.error('Ficheiro vazio'); return; }

        const headers = Object.keys(json[0]);
        const fieldMap: Record<string, keyof SolarTier> = {};
        headers.forEach((h) => {
          const field = resolveField(h);
          if (field) fieldMap[h] = field;
        });

        if (Object.keys(fieldMap).length === 0) {
          toast.error('Nenhuma coluna reconhecida. Use: kWp Min, kWp Max, Base Trans., Adic. Trans., Base AAS, Adic. AAS');
          return;
        }

        const imported: SolarTier[] = json.map((row) => {
          const tier: SolarTier = { ...DEFAULT_TIER };
          Object.entries(fieldMap).forEach(([header, field]) => {
            (tier as any)[field] = parseNum(row[header]);
          });
          return tier;
        });

        onChange({ ...rule, tiers: [...tiers, ...imported] });
        toast.success(`${imported.length} escalão(ões) importados`);
      } catch {
        toast.error('Erro ao ler o ficheiro');
      }
    };
    reader.readAsArrayBuffer(file);
  }, [tiers, rule, onChange]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Escalões</div>

      <div className="relative w-full overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {TIERED_COLUMNS.map((col) => (
                <TableHead key={col.field} className="text-xs whitespace-nowrap">{col.label}</TableHead>
              ))}
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.length === 0 && (
              <TableRow>
                <TableCell colSpan={TIERED_COLUMNS.length + 1} className="text-center text-sm text-muted-foreground py-6">
                  Nenhum escalão configurado. Adicione uma linha ou importe um ficheiro.
                </TableCell>
              </TableRow>
            )}
            {tiers.map((tier, idx) => (
              <TableRow key={idx}>
                {TIERED_COLUMNS.map((col) => (
                  <TableCell key={col.field} className="p-1.5">
                    <DecimalInput
                      className={`h-8 text-xs ${col.field === 'kwpMin' || col.field === 'kwpMax' ? 'w-20' : 'w-24'}`}
                      value={tier[col.field]}
                      onChange={(v) => updateTier(idx, col.field, v)}
                    />
                  </TableCell>
                ))}
                <TableCell className="p-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTier(idx)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addTier} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Adicionar Linha
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          className="gap-1.5"
        >
          <FileSpreadsheet className="h-3.5 w-3.5" />
          Importar Escalões
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImportFile(f);
            e.target.value = '';
          }}
        />
      </div>
    </div>
  );
}

// ─── Decimal Input ───

const DecimalInput = forwardRef<HTMLInputElement, {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}>(({ value, onChange, className }, ref) => {
  const format = (n: number) => (n === 0 ? '0' : String(n).replace('.', ','));
  const [text, setText] = useState(() => format(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(format(value));
  }, [value, focused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9.,]/g, '');
    setText(raw);
  };

  const handleBlur = () => {
    setFocused(false);
    const normalized = text.replace(',', '.');
    const parsed = parseFloat(normalized);
    const final = isNaN(parsed) ? 0 : parsed;
    onChange(final);
    setText(format(final));
  };

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      className={className}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
});
DecimalInput.displayName = 'DecimalInput';
