/**
 * Shared "Outros Serviços" section for proposals/sales.
 * Supports both legacy (fields-based) and new catalog format.
 */
import { useState } from 'react';
import { Radio, Wrench, X, Package } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableCombobox, type ComboboxOption } from '@/components/ui/searchable-combobox';
import { NumberInput } from '@/components/shared/NumberInput';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamMembers } from '@/hooks/useTeam';
import type {
  ServicosDetails,
  ServicosProductDetail,
  ServicosProductConfig,
  CatalogProduct,
  ModeloServico,
  ExtraCards,
} from '@/types/proposals';
import {
  FIELD_LABELS,
  getSaleLineCommission,
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
  /**
   * Who made this sale/proposal — the extra-card money is his, whole. Absent
   * means "being created now", so the person at the screen is the seller.
   */
  sellerUserId?: string | null;
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
  sellerUserId,
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
          sellerUserId={sellerUserId}
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
  sellerUserId,
  servicosProdutos,
  servicosDetails,
  onToggleProduct,
  onSetProductDetail,
  attempted,
}: {
  catalog: CatalogProduct[];
  operators: OperatorRef[];
  sellerUserId?: string | null;
  servicosProdutos: string[];
  servicosDetails: ServicosDetails;
  onToggleProduct: (name: string) => void;
  onSetProductDetail: (product: string, detail: ServicosProductDetail) => void;
  attempted?: boolean;
}) {
  // Three numbers per line, each with one meaning (see getSaleLineCommission):
  //   gross  — what the operator pays the org. This is what gets STORED in
  //            detail.comissao and saved to sales.comissao.
  //   seller — what the person who made the sale takes home.
  //   org    — the difference, the organization's margin.
  const { user } = useAuth();
  const { data: teamMembers = [] } = useTeamMembers();
  const currentUserId = user?.id;
  // Rates are keyed by WHO SOLD: the sale's own seller on an existing sale,
  // the person filling the form on a new one.
  const sellerId = sellerUserId ?? currentUserId;
  const sellerProfileId = teamMembers.find((m) => m.user_id === sellerId)?.profile_id ?? null;
  const viewerIsSeller = sellerId === currentUserId;

  const lineCommission = (product: CatalogProduct, qty: number, extraCards?: ExtraCards) =>
    getSaleLineCommission(product, qty, extraCards, sellerId, sellerProfileId);

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
  // The pool that actually gets saved to the sale (sales.comissao), across
  // every recipient — shown under the seller's own total so the sale can be
  // checked without logging in as each person who gets paid.
  const totalPoolComissao = servicosProdutos.reduce((sum, p) => sum + (servicosDetails[p]?.comissao || 0), 0);
  // Shown in the "Comissão Total" box below — the seller's own total, not the
  // pool (which is still what gets saved to the sale, via detail.comissao).
  // Resolved by the operator FROZEN on this line, not the current picker —
  // a line added under Digi stays a Digi line even if the picker moves on.
  const { totalSellerComissao, totalOrgComissao } = servicosProdutos.reduce(
    (acc, p) => {
      const detail = servicosDetails[p];
      const catProduct = resolveProduct(p, detail?.operator_id);
      if (!catProduct) return acc;
      const line = lineCommission(
        catProduct,
        detail?.quantidade ?? 1,
        detail?.total_cards != null
          ? { total: detail.total_cards }
          : { portabilidade: detail?.extra_cards_portability, novos: detail?.extra_cards_new },
      );
      return {
        totalSellerComissao: acc.totalSellerComissao + line.seller,
        totalOrgComissao: acc.totalOrgComissao + line.org,
      };
    },
    { totalSellerComissao: 0, totalOrgComissao: 0 },
  );

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
      const comissaoVal = lineCommission(catProduct, 1).gross;
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

        {/* Own labeled group, separated from Operadora above — that picker
            only narrows this search, it isn't the same choice as the
            product itself, and the two read as one control without a
            border between them. */}
        <div className="space-y-1.5 border-t pt-3">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Package className="h-3 w-3 shrink-0" /> Produto
          </Label>
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
        </div>

        {/* Selected products as editable cards */}
        {servicosProdutos.map((productName) => {
          const detail = servicosDetails[productName] || {};
          const catProduct = resolveProduct(productName, detail.operator_id);
          if (!catProduct) return null;
          const price = detail.price ?? catProduct.price;
          const isTiered = !!catProduct.quantity_tiers?.length;
          const commissionPct = detail.commission_pct ?? catProduct.commission_pct;
          const quantidade = detail.quantidade ?? 1;
          const unitPrice = isTiered ? getCatalogPriceForQuantity(catProduct, quantidade) : (catProduct.price || 0);
          // Extra SIM cards on top of the package's included ones — only
          // relevant for products the admin configured a per-card rate for.
          const supportsExtraCards = !!catProduct.extra_card_commission;
          // How many cards this line already includes by default — what the
          // seller sees pre-filled, and the baseline extras are counted from.
          const includedCards = catProduct.included_cards ?? 1;
          const totalCards = detail.total_cards ?? includedCards;
          const extraCardsCount = Math.max(0, totalCards - includedCards);
          const extraCards: ExtraCards = { total: totalCards };
          const line = lineCommission(catProduct, quantidade, extraCards);
          const hasCommission = line.gross > 0 || isTiered || catProduct.has_commission;
          // The seller's own take, per unit and for the whole line. Someone
          // who is not the seller sees zero — it is not their money.
          const myLineCommission = viewerIsSeller ? line.seller : 0;
          const myUnitCommission = quantidade > 0 ? myLineCommission / quantidade : 0;

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
                  <NumberInput
                    step={0.01}
                    min={0}
                    value={price}
                    onCommit={(newPrice) => {
                      const comissao = lineCommission({ ...catProduct, price: newPrice }, quantidade, extraCards).gross;
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
                  <NumberInput
                    min={1}
                    step={1}
                    value={quantidade}
                    onCommit={(n) => {
                      const newQty = Math.max(1, Math.round(n) || 1);
                      const comissao = lineCommission(catProduct, newQty, extraCards).gross;
                      const newPrice = isTiered
                        ? getCatalogPriceForQuantity(catProduct, newQty) * newQty
                        : unitPrice * newQty;
                      onSetProductDetail(productName, { ...detail, quantidade: newQty, comissao, price: newPrice });
                    }}
                    className="h-8"
                  />
                </div>
              </div>
              {supportsExtraCards && (
                <div className="space-y-1 max-w-[200px]">
                  <Label className="text-xs text-muted-foreground">Número de Cartões</Label>
                  <NumberInput
                    min={0}
                    step={1}
                    value={totalCards}
                    onCommit={(n) => {
                      const newTotal = Math.max(0, Math.round(n) || 0);
                      const nextExtra: ExtraCards = { total: newTotal };
                      const comissao = lineCommission(catProduct, quantidade, nextExtra).gross;
                      onSetProductDetail(productName, { ...detail, total_cards: newTotal, comissao });
                    }}
                    className="h-8"
                  />
                  {/* This product already includes some, so only the difference
                      pays extra-card commission — spell it out, since "3
                      cartões" alone doesn't say how many of those are extra. */}
                  <p className="text-[11px] text-muted-foreground">
                    {includedCards} incluído{includedCards === 1 ? '' : 's'}
                    {extraCardsCount > 0 && <> · {extraCardsCount} extra{extraCardsCount === 1 ? '' : 's'}</>}
                  </p>
                </div>
              )}
              {hasCommission && (
                <div className="text-xs text-muted-foreground">
                  A tua parte ({quantidade} unid.): <span className="font-medium text-foreground">
                    {myLineCommission.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                  </span>
                  {/* The pool this line pays out across everyone — shown next to
                      the seller's own cut so a sale can be checked without
                      logging in as each recipient. */}
                  {Math.abs((detail.comissao ?? 0) - myLineCommission) > 0.005 && (
                    <span> · total {(detail.comissao ?? 0).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}</span>
                  )}
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
            <Label className="text-xs text-muted-foreground">
              {viewerIsSeller ? 'A Tua Comissão (€)' : 'Comissão do Vendedor (€)'}
            </Label>
            <div className="h-8 flex items-center text-sm font-medium px-3 rounded-md bg-muted">
              {totalSellerComissao ? totalSellerComissao.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : '—'}
            </div>
            {/* What the operator pays, and what is left over for the org once
                the seller has taken his rate. */}
            {totalOrgComissao > 0.005 && (
              <p className="text-[11px] text-muted-foreground">
                Operadora paga {totalPoolComissao.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                {' · '}Organização fica com {totalOrgComissao.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
              </p>
            )}
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
