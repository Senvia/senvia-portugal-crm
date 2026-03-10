/**
 * Shared component for rendering the "Outros Serviços" section in proposals/sales.
 * Supports both legacy (fields-based) and new catalog format.
 */
import { Wrench, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ServicosDetails,
  ServicosProductConfig,
  CatalogProduct,
  ModeloServico,
} from '@/types/proposals';
import { FIELD_LABELS } from '@/types/proposals';

interface ServicosSectionProps {
  // Common
  modeloServico: ModeloServico;
  onModeloServicoChange: (v: ModeloServico) => void;
  servicosProdutos: string[];
  servicosDetails: ServicosDetails;
  attempted?: boolean;

  // Legacy format
  isNewFormat: boolean;
  configs?: ServicosProductConfig[];
  catalog?: CatalogProduct[] | null;

  // Handlers
  onToggleProduct: (name: string) => void;
  onUpdateDetail: (product: string, field: string, value: number | undefined) => void;

  // Legacy-specific
  isAutoCalculated?: (product: string) => boolean;

  // Totals (legacy)
  totalKwp?: number;
  totalComissao?: number;
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
  onToggleProduct,
  onUpdateDetail,
  isAutoCalculated,
  totalKwp,
  totalComissao,
}: ServicosSectionProps) {
  if (isNewFormat && catalog) {
    return (
      <NewFormatSection
        catalog={catalog}
        modeloServico={modeloServico}
        onModeloServicoChange={onModeloServicoChange}
        servicosProdutos={servicosProdutos}
        servicosDetails={servicosDetails}
        onToggleProduct={onToggleProduct}
        onUpdateDetail={onUpdateDetail}
        attempted={attempted}
      />
    );
  }

  return (
    <LegacyFormatSection
      configs={configs}
      modeloServico={modeloServico}
      onModeloServicoChange={onModeloServicoChange}
      servicosProdutos={servicosProdutos}
      servicosDetails={servicosDetails}
      onToggleProduct={onToggleProduct}
      onUpdateDetail={onUpdateDetail}
      isAutoCalculated={isAutoCalculated}
      attempted={attempted}
      totalKwp={totalKwp}
      totalComissao={totalComissao}
    />
  );
}

// ─── New Catalog Format ───

function NewFormatSection({
  catalog,
  modeloServico,
  onModeloServicoChange,
  servicosProdutos,
  servicosDetails,
  onToggleProduct,
  onUpdateDetail,
  attempted,
}: {
  catalog: CatalogProduct[];
  modeloServico: ModeloServico;
  onModeloServicoChange: (v: ModeloServico) => void;
  servicosProdutos: string[];
  servicosDetails: ServicosDetails;
  onToggleProduct: (name: string) => void;
  onUpdateDetail: (product: string, field: string, value: number | undefined) => void;
  attempted?: boolean;
}) {
  const totalComissao = servicosProdutos.reduce((sum, p) => {
    const d = servicosDetails[p];
    return sum + (d?.comissao || 0);
  }, 0);

  const totalPrice = servicosProdutos.reduce((sum, p) => {
    const d = servicosDetails[p];
    return sum + (d?.price || 0);
  }, 0);

  return (
    <div className="space-y-4 p-4 rounded-lg border bg-secondary/30 border-border">
      <div className="flex items-center gap-2 text-foreground">
        <Wrench className="h-4 w-4" />
        <span className="font-medium text-sm">Outros Serviços</span>
      </div>

      {/* Modelo de Serviço */}
      <div className="space-y-2">
        <Label className="text-sm">Modelo de Serviço</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={modeloServico === 'transacional' ? 'default' : 'outline'}
            size="sm"
            className="h-9"
            onClick={() => onModeloServicoChange('transacional')}
          >
            Transacional
          </Button>
          <Button
            type="button"
            variant={modeloServico === 'saas' ? 'default' : 'outline'}
            size="sm"
            className="h-9"
            onClick={() => onModeloServicoChange('saas')}
          >
            SAAS
          </Button>
        </div>
      </div>

      {/* Product catalog selection */}
      <div className="space-y-3">
        <Label className="text-sm">Produtos do Catálogo</Label>
        {attempted && servicosProdutos.length === 0 && (
          <p className="text-xs text-destructive">Selecione pelo menos 1 produto</p>
        )}
        
        {catalog.map((catProduct) => {
          const isActive = servicosProdutos.includes(catProduct.name);
          const detail = servicosDetails[catProduct.name] || {};
          
          return (
            <div key={catProduct.name} className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`cat-produto-${catProduct.name}`}
                  checked={isActive}
                  onCheckedChange={() => onToggleProduct(catProduct.name)}
                />
                <Label htmlFor={`cat-produto-${catProduct.name}`} className="text-sm cursor-pointer font-medium flex items-center gap-2">
                  {catProduct.name}
                  <span className="text-xs text-muted-foreground font-normal">
                    ({catProduct.price.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })})
                  </span>
                  {catProduct.has_commission && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {catProduct.commission_pct}% comissão
                    </Badge>
                  )}
                </Label>
              </div>

              {isActive && (
                <div className="ml-6 p-3 rounded-md bg-muted/50 border border-border/50 space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                    Valores para esta proposta/venda (editáveis)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Nome</Label>
                      <Input
                        value={detail.name ?? catProduct.name}
                        onChange={(e) => onUpdateDetail(catProduct.name, 'name', undefined)}
                        onChangeCapture={(e) => {
                          // Handle string field via custom event
                          const input = e.target as HTMLInputElement;
                          onUpdateDetail(catProduct.name, 'name', undefined);
                          // We need a different approach for string fields
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
                        value={detail.price ?? catProduct.price}
                        onChange={(e) => onUpdateDetail(catProduct.name, 'price', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="h-8"
                        placeholder="0.00"
                      />
                    </div>
                    {catProduct.has_commission && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Comissão (%)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={detail.commission_pct ?? catProduct.commission_pct}
                          onChange={(e) => onUpdateDetail(catProduct.name, 'commission_pct', e.target.value ? parseFloat(e.target.value) : undefined)}
                          className="h-8"
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>
                  {catProduct.has_commission && (
                    <div className="text-xs text-muted-foreground">
                      Comissão: <span className="font-medium text-foreground">
                        {((detail.price ?? catProduct.price) * (detail.commission_pct ?? catProduct.commission_pct) / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' })}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Totals */}
      {servicosProdutos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Valor Total (€)</Label>
            <div className="h-8 flex items-center text-sm font-medium px-3 rounded-md bg-muted">
              {totalPrice ? totalPrice.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : '—'}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Comissão Total (€)</Label>
            <div className="h-8 flex items-center text-sm font-medium px-3 rounded-md bg-muted">
              {totalComissao ? totalComissao.toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' }) : '—'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Legacy Format (Perfect2Gether) ───

function LegacyFormatSection({
  configs,
  modeloServico,
  onModeloServicoChange,
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
  modeloServico: ModeloServico;
  onModeloServicoChange: (v: ModeloServico) => void;
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
    <div className="space-y-4 p-4 rounded-lg border bg-secondary/30 border-border">
      <div className="flex items-center gap-2 text-foreground">
        <Wrench className="h-4 w-4" />
        <span className="font-medium text-sm">Outros Serviços</span>
      </div>

      {/* Modelo de Serviço */}
      <div className="space-y-2">
        <Label className="text-sm">Modelo de Serviço</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={modeloServico === 'transacional' ? 'default' : 'outline'}
            size="sm"
            className="h-9"
            onClick={() => onModeloServicoChange('transacional')}
          >
            Transacional
          </Button>
          <Button
            type="button"
            variant={modeloServico === 'saas' ? 'default' : 'outline'}
            size="sm"
            className="h-9"
            onClick={() => onModeloServicoChange('saas')}
          >
            SAAS
          </Button>
        </div>
      </div>

      {/* Produtos em linha */}
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

      {/* kWp Total + Comissão Total */}
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
    </div>
  );
}
