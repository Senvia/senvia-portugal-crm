import { useState, useEffect, useRef, useCallback } from 'react';
import { Calculator, Info, Plus, Trash2, Sun, Battery, Gauge, Home, Save, X, FileSpreadsheet } from 'lucide-react';
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
  base_plus_per_kwp: 'Base + Taxa/kWp',
  percentage_valor: '% do Valor',
  per_kwp: 'EUR / kWp',
  fixed: 'Valor Fixo (€)',
  manual: 'Manual',
};

const ALL_METHODS = ['tiered_kwp', 'base_plus_per_kwp', 'percentage_valor', 'per_kwp', 'fixed', 'manual'] as const;

const DEFAULT_TIER: SolarTier = { kwpMin: 0, kwpMax: 0, baseTransaccional: 0, adicTransaccional: 0, baseAas: 0, adicAas: 0 };

const PRODUCT_ICONS: Record<string, React.ElementType> = {
  'Solar': Sun,
  'Baterias': Battery,
  'Condensadores': Gauge,
  'Coberturas': Home,
  'Carregadores': Battery,
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
      return 'Comissão = Base + (kWp - kWpMin) × Adicional (por escalão, Transaccional ou AAS)';
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

function getTierCount(rule: CommissionRule): number | null {
  if (rule.method === 'tiered_kwp') return rule.tiers?.length ?? 0;
  return null;
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
      initial[p] = saved?.[p] ?? { method: 'manual' };
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

      {/* Grid of product cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {SERVICOS_PRODUCTS.map((product) => {
          const rule = localMatrix[product] ?? { method: 'manual' as const };
          const Icon = getProductIcon(product);
          const tierCount = getTierCount(rule);

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
                  {METHOD_LABELS[rule.method]}
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

      {/* Product modal */}
      {openProduct && (
        <ProductModal
          product={openProduct}
          rule={localMatrix[openProduct] ?? { method: 'manual' }}
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
          {/* Method selector */}
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

          {/* Tiered kWp — table */}
          {rule.method === 'tiered_kwp' && (
            <TieredTableEditor rule={rule} onChange={onRuleChange} />
          )}

          {/* Base + Per kWp */}
          {rule.method === 'base_plus_per_kwp' && (
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Valor Base (€)</Label>
                <DecimalInput className="h-9" value={rule.base ?? 0} onChange={(v) => onRuleChange({ ...rule, base: v })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Taxa por kWp (€)</Label>
                <DecimalInput className="h-9" value={rule.ratePerKwp ?? 0} onChange={(v) => onRuleChange({ ...rule, ratePerKwp: v })} />
              </div>
            </div>
          )}

          {/* Percentage */}
          {rule.method === 'percentage_valor' && (
            <div className="max-w-xs space-y-1.5">
              <Label className="text-xs text-muted-foreground">Percentagem (%)</Label>
              <DecimalInput className="h-9" value={rule.rate ?? 0} onChange={(v) => onRuleChange({ ...rule, rate: v })} />
            </div>
          )}

          {/* Per kWp */}
          {rule.method === 'per_kwp' && (
            <div className="max-w-xs space-y-1.5">
              <Label className="text-xs text-muted-foreground">Taxa (€/kWp)</Label>
              <DecimalInput className="h-9" value={rule.rate ?? 0} onChange={(v) => onRuleChange({ ...rule, rate: v })} />
            </div>
          )}

          {/* Fixed */}
          {rule.method === 'fixed' && (
            <div className="max-w-xs space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor Fixo (€)</Label>
              <DecimalInput className="h-9" value={rule.rate ?? 0} onChange={(v) => onRuleChange({ ...rule, rate: v })} />
            </div>
          )}

          {/* Formula preview */}
          <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
            <span>{getFormulaPreview(rule)}</span>
          </div>
        </div>

        {/* Footer */}
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

// ─── Tiered Table Editor ───

function TieredTableEditor({
  rule,
  onChange,
}: {
  rule: { method: 'tiered_kwp'; tiers: SolarTier[] };
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
      <div className="text-sm font-medium">Escalões Solar</div>

      <div className="relative w-full overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs whitespace-nowrap">kWp Min</TableHead>
              <TableHead className="text-xs whitespace-nowrap">kWp Max</TableHead>
              <TableHead className="text-xs whitespace-nowrap">Base Trans. (€)</TableHead>
              <TableHead className="text-xs whitespace-nowrap">Adic. Trans. (€/kWp)</TableHead>
              <TableHead className="text-xs whitespace-nowrap">Base AAS (€)</TableHead>
              <TableHead className="text-xs whitespace-nowrap">Adic. AAS (€/kWp)</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                  Nenhum escalão configurado. Adicione uma linha ou importe um ficheiro.
                </TableCell>
              </TableRow>
            )}
            {tiers.map((tier, idx) => (
              <TableRow key={idx}>
                <TableCell className="p-1.5">
                  <DecimalInput className="h-8 text-xs w-20" value={tier.kwpMin} onChange={(v) => updateTier(idx, 'kwpMin', v)} />
                </TableCell>
                <TableCell className="p-1.5">
                  <DecimalInput className="h-8 text-xs w-20" value={tier.kwpMax} onChange={(v) => updateTier(idx, 'kwpMax', v)} />
                </TableCell>
                <TableCell className="p-1.5">
                  <DecimalInput className="h-8 text-xs w-24" value={tier.baseTransaccional} onChange={(v) => updateTier(idx, 'baseTransaccional', v)} />
                </TableCell>
                <TableCell className="p-1.5">
                  <DecimalInput className="h-8 text-xs w-24" value={tier.adicTransaccional} onChange={(v) => updateTier(idx, 'adicTransaccional', v)} />
                </TableCell>
                <TableCell className="p-1.5">
                  <DecimalInput className="h-8 text-xs w-24" value={tier.baseAas} onChange={(v) => updateTier(idx, 'baseAas', v)} />
                </TableCell>
                <TableCell className="p-1.5">
                  <DecimalInput className="h-8 text-xs w-24" value={tier.adicAas} onChange={(v) => updateTier(idx, 'adicAas', v)} />
                </TableCell>
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

function DecimalInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
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
      type="text"
      inputMode="decimal"
      className={className}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}
