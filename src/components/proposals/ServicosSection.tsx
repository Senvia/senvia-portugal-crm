/**
 * Shared "Outros Serviços" section for proposals/sales.
 * Supports both legacy (fields-based) and new catalog format.
 */
import { useState } from 'react';
import { Radio, Wrench, X } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/searchable-combobox';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from '@/hooks/useTeam';
import type {
  ServicosDetails,
  ServicosProductDetail,
  ServicosProductConfig,
  CatalogProduct,
  ModeloServico,
} from '@/types/proposals';
import {
  FIELD_LABELS,
  getCatalogCommission,
  getCatalogCommissionForQuantity,
  getCatalogCommissionForUser,
  getCatalogCommissionForQuantityForUser,
  getCatalogPriceForQuantity,
} from '@/types/proposals';

interface OperatorRef {
  id: string;
  name: string;
}

interface ServicosSectionProps {
  modeloServico: ModeloServico;
  onModeloServicoChange: (v: ModeloServico) => void;
  servicosProdutos: string[];
  servicosDetails: ServicosDetails;
  attempted?: boolean;
  isNewFormat: boolean;
  configs?: ServicosProductConfig[];
  catalog?: CatalogProduct[] | null;
  /** So the "add product" search can also match by operator name (Digi, Vodafone...). */
  operators?: OperatorRef[];
  onToggleProduct: (name: string) => void;
  /** For legacy format: update a single numeric field */
  onUpdateDetail: (product: string, field: string, value: number | undefined) => void;
  /** For new format: set the full details for a product */
  onSetProductDetail: (product: string, detail: ServicosProductDetail) => void;
  isAutoCalculated?: (product: string) => boolean;
  totalKwp?: number;
  totalComissao?: number;
  hideModeloServico?: boolean;
}

export function ServicosSection({
  modeloServico,
  onModeloServicoChange,
  servicosProdutos,
  servicosDetails,
  attempted,
  isNewFormat,
  configs = [],
  catalog,
  operators = [],
  onToggleProduct,
  onUpdateDetail,
  onSetProductDetail,
  isAutoCalculated,
  totalKwp,
  totalComissao,
  hideModeloServico,
}: ServicosSectionProps) {
  return (
    <div className="space-y-4 p-4 rounded-lg border bg-secondary/30 border-border">
      <div className="flex items-center gap-2 text-foreground">
        <Wrench className="h-4 w-4" />
        <span className="font-medium text-sm">Outros Serviços</span>
      </div>

      {/* Modelo de Serviço */}
      {!hideModeloServico && (
        <div className="space-y-2">
          <Label className="text-sm">Modelo de Serviço</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={modeloServico === 'transacional' ? 'default' : 'outline'} size="sm" className="h-9" onClick={() => onModeloServicoChange('transacional')}>
              Transacional
            </Button>
            <Button type="button" variant={modeloServico === 'saas' ? 'default' : 'outline'} size="sm" className="h-9" onClick={() => onModeloServicoChange('saas')}>
              SAAS
            </Button>
          </div>
        </div>
      )}

      {isNewFormat && catalog ? (
        <CatalogProducts
          catalog={catalog}
          operators={operators}
          servicosProdutos={servicosProdutos}
          servicosDetails={servicosDetails}
          onToggleProduct={onToggleProduct}
          onSetProductDetail={onSetProductDetail}
          attempted={attempted}
        />
      ) : (
        <LegacyProducts
          configs={configs}
          servicosProdutos={servicosProdutos}
          servicosDetails={servicosDetails}
          onToggleProduct={onToggleProduct}
          onUpdateDetail={onUpdateDetail}
          isAutoCalculated={isAutoCalculated}
          attempted={attempted}
          totalKwp={totalKwp}
          totalComissao={totalComissao}
        />
      )}
    </div>
  );
}

// ─── New Catalog Format ───

function CatalogProducts({
  catalog,
  operators,
  servicosProdutos,
  servicosDetails,
  onToggleProduct,
  onSetProductDetail,
  attempted,
}: {
  catalog: CatalogProduct[];
  operators: OperatorRef[];
  servicosProdutos: string[];
  servicosDetails: ServicosDetails;
  onToggleProduct: (name: string) => void;
  onSetProductDetail: (product: string, detail: ServicosProductDetail) => void;
  attempted?: boolean;
}) {
  // `detail.comissao` (stored, per product line) stays the POOL total — every
  // recipient's share combined. It feeds sales.comissao on save, which in turn
  // drives crm_clients.total_comissao and Finance's payable totals, so it must
  // keep meaning "what this line costs the company", not "what I get".
  //
  // What changes here is purely the DISPLAY: the badge and the per-line text
  // show only the logged-in seller's own cut (getCatalogCommissionForUser),
  // computed separately and never written back into `detail.comissao`.
  const { user } = useAuth();
  const { data: teamMembers = [] } = useTeamMembers();
  const currentUserId = user?.id;
  const currentUserProfileId = teamMembers.find((m) => m.user_id === currentUserId)?.profile_id ?? null;

  const operatorById = new Map(operators.map((o) => [o.id, o.name]));

  /**
   * The catalog entry a product NAME resolves to for a given operator
   * context — the operator-specific entry when there is one, else the
   * operator-agnostic one. Now that the same name can exist once per
   * operator (see CreateTelecomProductModal), a bare `catalog.find(name)`
   * is ambiguous; every lookup below goes through this instead.
   */
  const resolveProduct = (name: string, operatorId: string | null | undefined): CatalogProduct | undefined => {
    const specific = operatorId ? catalog.find((c) => c.name === name && c.operator_id === operatorId) : undefined;
    return specific ?? catalog.find((c) => c.name === name && !c.operator_id);
  };

  // Which operator this "add product" search is shopping for. A product with
  // no operator_id at all (e.g. "1P" priced the same for MEO/Vodafone/NOS)
  // shows up no matter which operator is picked here; a product tied to a
  // SPECIFIC operator (e.g. "1P" for Digi, which pays differently) only shows
  // up under that one — and, when both exist for the same name, the
  // operator-specific one wins over the generic one (an explicit override).
  const [addOperatorId, setAddOperatorId] = useState<string | null>(null);

  const totalPrice = servicosProdutos.reduce((sum, p) => sum + (servicosDetails[p]?.price || 0), 0);
  // Shown in the "Comissão Total" box below — the seller's own total, not the
  // pool (which is still what gets saved to the sale, via detail.comissao).
  // Resolved by the operator FROZEN on this line, not the current picker —
  // a line added under Digi stays a Digi line even if the picker moves on.
  const totalMyComissao = servicosProdutos.reduce((sum, p) => {
    const catProduct = resolveProduct(p, servicosDetails[p]?.operator_id);
    if (!catProduct) return sum;
    const qty = servicosDetails[p]?.quantidade ?? 1;
    return sum + (catProduct.quantity_tiers?.length
      ? getCatalogCommissionForQuantityForUser(catProduct, qty, currentUserId, currentUserProfileId)
      : getCatalogCommissionForUser(catProduct, currentUserId, currentUserProfileId) * qty);
  }, 0);

  // Build combobox options: for the chosen operator, every product tied to it
  // plus every operator-agnostic one — deduplicated by name (the specific
  // entry wins), excluding names already added to this sale/proposta.
  const comboboxOptions: ComboboxOption[] = (() => {
    const seen = new Set<string>();
    const eligible = catalog.filter((c) => c.operator_id === addOperatorId || !c.operator_id);
    // Operator-specific entries first, so they claim the name before the
    // operator-agnostic fallback for the same name is considered.
    const ordered = [...eligible].sort((a, b) => (a.operator_id ? -1 : 0) - (b.operator_id ? -1 : 0));
    const options: ComboboxOption[] = [];
    for (const c of ordered) {
      if (seen.has(c.name) || servicosProdutos.includes(c.name)) continue;
      seen.add(c.name);
      const operatorName = c.operator_id ? operatorById.get(c.operator_id) : undefined;
      const priceText = c.price ? c.price.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : null;
      const sublabel = [operatorName, priceText].filter(Boolean).join(' · ') || undefined;
      options.push({ value: c.name, label: c.name, sublabel });
    }
    return options;
  })();

  const handleAddProduct = (value: string | null) => {
    if (!value) return;
    onToggleProduct(value);
    const catProduct = resolveProduct(value, addOperatorId);
    if (catProduct) {
      const isTiered = !!catProduct.quantity_tiers?.length;
      // Pool total (every recipient combined) — this is what gets saved.
      const comissaoVal = isTiered
        ? getCatalogCommissionForQuantity(catProduct, 1)
        : getCatalogCommission(catProduct);
      const priceVal = isTiered ? getCatalogPriceForQuantity(catProduct, 1) : catProduct.price;
      // The operator explicitly chosen above wins over the product's own
      // (possibly absent) operator_id — a generic "1P" added while MEO is
      // selected must freeze onto the sale as a MEO line, not an operatorless
      // one, or the proposal-number field and telecom lifecycle lose it.
      const frozenOperatorId = addOperatorId ?? catProduct.operator_id;
      onSetProductDetail(value, {
        price: priceVal,
        commission_pct: catProduct.commission_pct,
        commission_type: catProduct.commission_type ?? 'pct',
        commission_fixed: catProduct.commission_fixed ?? 0,
        comissao: comissaoVal,
        quantidade: 1,
        operator_id: frozenOperatorId,
        operator_name: frozenOperatorId ? operatorById.get(frozenOperatorId) : undefined,
      });
    }
  };

  return (
    <>
      <div className="space-y-3">
        <Label className="text-sm">Produtos do Catálogo</Label>
        {attempted && servicosProdutos.length === 0 && (
          <p className="text-xs text-destructive">Selecione pelo menos 1 produto</p>
        )}

        {/* Operadora a comprar — filtra a pesquisa abaixo aos produtos dessa
            operadora + aos que servem para qualquer uma (sem operadora
            fixada no catálogo). Fica selecionada entre adições, para não
            obrigar a escolher outra vez a cada produto da mesma operadora. */}
        {operators.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Radio className="h-3 w-3 shrink-0" /> Operadora
            </Label>
            <Select
              value={addOperatorId ?? '__geral__'}
              onValueChange={(v) => setAddOperatorId(v === '__geral__' ? null : v)}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="Nenhuma (produtos gerais)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__geral__">Nenhuma (produtos gerais)</SelectItem>
                {operators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Searchable dropdown to add products */}
        <SearchableCombobox
          options={comboboxOptions}
          value={null}
          onValueChange={handleAddProduct}
          placeholder="Pesquisar e adicionar produto..."
          searchPlaceholder="Escreva para pesquisar..."
          emptyText="Nenhum produto encontrado."
          emptyValue="__none__"
          emptyLabel="Nenhum"
        />

        {/* Selected products as editable cards */}
        {servicosProdutos.map((productName) => {
          const detail = servicosDetails[productName] || {};
          const catProduct = resolveProduct(productName, detail.operator_id);
          if (!catProduct) return null;
          const price = detail.price ?? catProduct.price;
          const isTiered = !!catProduct.quantity_tiers?.length;
          // Pool unit commission — every recipient combined. Drives what
          // actually gets saved (detail.comissao) and whether the commission
          // UI shows up at all.
          const poolUnitCommission = getCatalogCommission(catProduct);
          const hasCommission = isTiered || poolUnitCommission > 0 || catProduct.has_commission;
          // Only THIS seller's own cut — what the badge and the line below
          // show. A product that pays someone else entirely correctly shows
          // 0 € here, instead of the whole team's commission as if it were
          // all theirs.
          const myUnitCommission = getCatalogCommissionForUser(catProduct, currentUserId, currentUserProfileId);
          const commissionPct = detail.commission_pct ?? catProduct.commission_pct;
          const quantidade = detail.quantidade ?? 1;
          const unitPrice = isTiered ? getCatalogPriceForQuantity(catProduct, quantidade) : (catProduct.price || 0);
          const myLineCommission = isTiered
            ? getCatalogCommissionForQuantityForUser(catProduct, quantidade, currentUserId, currentUserProfileId)
            : myUnitCommission * quantidade;

          return (
            <div key={productName} className="p-3 rounded-md bg-muted/50 border border-border/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{detail.name ?? productName}</span>
                  {(detail.operator_name ?? (catProduct.operator_id ? operatorById.get(catProduct.operator_id) : undefined)) && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      {detail.operator_name ?? operatorById.get(catProduct.operator_id!)}
                    </Badge>
                  )}
                  {hasCommission && !isTiered && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {myUnitCommission.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })} comissão/unid.
                    </Badge>
                  )}
                  {isTiered && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      Comissão por escalão
                    </Badge>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onToggleProduct(productName)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={detail.name ?? catProduct.name}
                    onChange={(e) => {
                      onSetProductDetail(productName, { ...detail, name: e.target.value });
                    }}
                    className="h-8 text-sm"
                    placeholder={catProduct.name}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Preço (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => {
                      const newPrice = parseFloat(e.target.value) || 0;
                      const comissao = isTiered
                        ? getCatalogCommissionForQuantity({ ...catProduct, price: newPrice }, quantidade)
                        : getCatalogCommission({ ...catProduct, price: newPrice }) * quantidade;
                      onSetProductDetail(productName, { ...detail, price: newPrice, comissao });
                    }}
                    className="h-8"
                  />
                </div>
                {/* Quantity applies to every product — you can sell three of
                    the same package. Tiered products additionally resolve
                    their band (and price) from it. */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={quantidade}
                    onChange={(e) => {
                      const newQty = Math.max(1, parseInt(e.target.value, 10) || 1);
                      const comissao = isTiered
                        ? getCatalogCommissionForQuantity(catProduct, newQty)
                        : poolUnitCommission * newQty;
                      const newPrice = isTiered
                        ? getCatalogPriceForQuantity(catProduct, newQty) * newQty
                        : unitPrice * newQty;
                      onSetProductDetail(productName, { ...detail, quantidade: newQty, comissao, price: newPrice });
                    }}
                    className="h-8"
                  />
                </div>
              </div>
              {hasCommission && (
                <div className="text-xs text-muted-foreground">
                  Comissão ({quantidade} unid.): <span className="font-medium text-foreground">
                    {myLineCommission.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  </span>
                  {isTiered && !catProduct.quantity_tiers?.some(t => quantidade >= t.min && (t.max == null || quantidade <= t.max)) && (
                    <span className="ml-1 text-destructive">(sem escalão para esta quantidade)</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {servicosProdutos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Valor Total (€)</Label>
            <div className="h-8 flex items-center text-sm font-medium px-3 rounded-md bg-muted">
              {totalPrice ? totalPrice.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : '—'}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">A Tua Comissão (€)</Label>
            <div className="h-8 flex items-center text-sm font-medium px-3 rounded-md bg-muted">
              {totalMyComissao ? totalMyComissao.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : '—'}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Legacy Format ───

function LegacyProducts({
  configs,
  servicosProdutos,
  servicosDetails,
  onToggleProduct,
  onUpdateDetail,
  isAutoCalculated,
  attempted,
  totalKwp,
  totalComissao,
}: {
  configs: ServicosProductConfig[];
  servicosProdutos: string[];
  servicosDetails: ServicosDetails;
  onToggleProduct: (name: string) => void;
  onUpdateDetail: (product: string, field: string, value: number | undefined) => void;
  isAutoCalculated?: (product: string) => boolean;
  attempted?: boolean;
  totalKwp?: number;
  totalComissao?: number;
}) {
  return (
    <>
      <div className="space-y-3">
        <Label className="text-sm">Produtos</Label>
        {attempted && servicosProdutos.length === 0 && (
          <p className="text-xs text-destructive">Selecione pelo menos 1 produto</p>
        )}
        {configs.map((config) => {
          const isActive = servicosProdutos.includes(config.name);
          const detail = servicosDetails[config.name] || {};
          return (
            <div key={config.name} className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`produto-${config.name}`}
                  checked={isActive}
                  onCheckedChange={() => onToggleProduct(config.name)}
                />
                <Label htmlFor={`produto-${config.name}`} className="text-sm cursor-pointer font-medium">
                  {config.name}
                </Label>
              </div>
              {isActive && (
                <div className="ml-6 flex flex-wrap gap-2">
                  {config.fields.map((field) => {
                    const isComissaoAuto = field === 'comissao' && isAutoCalculated?.(config.name);
                    return (
                      <div key={field} className="space-y-1 min-w-[100px] flex-1">
                        <Label className="text-xs text-muted-foreground">
                          {FIELD_LABELS[field]} <span className="text-destructive">*</span>
                          {isComissaoAuto && <span className="ml-1 text-primary">(auto)</span>}
                        </Label>
                        {attempted && (detail[field] === undefined || detail[field] <= 0) && (
                          <p className="text-[10px] text-destructive">Obrigatório</p>
                        )}
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={detail[field] ?? ''}
                          onChange={(e) => onUpdateDetail(config.name, field, e.target.value ? parseFloat(e.target.value) : undefined)}
                          placeholder={field === 'kwp' && config.kwpAuto ? 'Auto' : '0'}
                          className="h-8"
                          readOnly={(field === 'kwp' && !!config.kwpAuto && detail.valor !== undefined) || !!isComissaoAuto}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">kWp Total</Label>
          <div className="h-8 flex items-center text-sm font-medium px-3 rounded-md bg-muted">
            {totalKwp ? totalKwp.toLocaleString('pt-PT', { maximumFractionDigits: 2 }) : '—'}
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Comissão Total (€)</Label>
          <div className="h-8 flex items-center text-sm font-medium px-3 rounded-md bg-muted">
            {totalComissao ? totalComissao.toLocaleString('pt-PT', { maximumFractionDigits: 2 }) : '—'}
          </div>
        </div>
      </div>
    </>
  );
}
