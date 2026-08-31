import { useState, useEffect } from 'react';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useOrganization, useUpdateOrganization } from '@/hooks/useOrganization';
import { CreateTelecomProductModal } from './CreateTelecomProductModal';
import { cn } from '@/lib/utils';
import type { CatalogProduct } from '@/types/proposals';
import type { Json } from '@/integrations/supabase/types';

export function ServicosProductsManager() {
  const { data: org } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  // Orgs still on the old [{name, fields}] shape cannot be edited here. Saving
  // would replace their catalog with an empty one, so we block it instead.
  const [isLegacyConfig, setIsLegacyConfig] = useState(false);

  useEffect(() => {
    const saved = (org as any)?.servicos_products_config as CatalogProduct[] | null;
    const hasSaved = !!saved && Array.isArray(saved) && saved.length > 0;
    const isCatalog = hasSaved && typeof saved![0].price === 'number';
    setIsLegacyConfig(hasSaved && !isCatalog);
    // Start with an empty catalog for new orgs
    setProducts(isCatalog ? saved! : []);
  }, [org]);

  const handleSave = () => {
    updateOrg.mutate({ servicos_products_config: products as unknown as Json });
  };

  const addProduct = (product: CatalogProduct) => {
    const next = [...products, product];
    setProducts(next);
    updateOrg.mutate({ servicos_products_config: next as unknown as Json });
  };

  const removeProduct = (name: string) => {
    setProducts(prev => prev.filter(p => p.name !== name));
  };

  const updateProduct = (name: string, updates: Partial<CatalogProduct>) => {
    setProducts(prev => prev.map(p =>
      p.name === name ? { ...p, ...updates } : p
    ));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Produtos Telecom (Serviços)
          </CardTitle>
          <CardDescription>
            Configure os produtos disponíveis para propostas e vendas de "Outros Serviços". 
            Na hora da venda, os valores podem ser editados sem alterar o catálogo.
          </CardDescription>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm" disabled={isLegacyConfig}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLegacyConfig && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Esta organização tem um catálogo no formato antigo, que este ecrã não sabe editar.
              Guardar aqui apagaria esse catálogo, por isso a gravação está bloqueada.
              Contacta o suporte para o converter.
            </p>
          </div>
        )}
        {products.map((product) => (
          <div key={product.name} className="p-4 rounded-lg border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{product.name}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeProduct(product.name)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Preço Base (€)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={product.price || ''}
                  onChange={(e) => updateProduct(product.name, { price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tem Comissão?</Label>
                <div className="flex items-center h-9">
                  <Switch
                    checked={product.has_commission}
                    onCheckedChange={(checked) => updateProduct(product.name, {
                      has_commission: checked,
                      commission_pct: checked ? product.commission_pct : 0,
                      commission_fixed: checked ? product.commission_fixed ?? 0 : 0,
                    })}
                  />
                </div>
              </div>

              {product.has_commission && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs text-muted-foreground">
                      {product.commission_type === 'fixed' ? 'Comissão (€)' : 'Comissão (%)'}
                    </Label>
                    <div className="flex overflow-hidden rounded-md border">
                      <button
                        type="button"
                        onClick={() => updateProduct(product.name, { commission_type: 'pct' })}
                        className={cn(
                          'px-2 py-0.5 text-[11px] leading-5 transition-colors',
                          product.commission_type !== 'fixed'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        onClick={() => updateProduct(product.name, { commission_type: 'fixed' })}
                        className={cn(
                          'px-2 py-0.5 text-[11px] leading-5 transition-colors',
                          product.commission_type === 'fixed'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-muted',
                        )}
                      >
                        €
                      </button>
                    </div>
                  </div>
                  {product.commission_type === 'fixed' ? (
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={product.commission_fixed || ''}
                      onChange={(e) => updateProduct(product.name, { commission_fixed: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="h-9"
                    />
                  ) : (
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={product.commission_pct || ''}
                      onChange={(e) => updateProduct(product.name, { commission_pct: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className="h-9"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {products.length === 0 && !isLegacyConfig && (
          <div className="py-10 text-center">
            <Settings2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">Ainda não tem produtos configurados.</p>
            <p className="text-sm text-muted-foreground">
              Adicione produtos para os poder vender em propostas e vendas.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={updateOrg.isPending || isLegacyConfig} size="sm">
            {updateOrg.isPending ? 'A guardar...' : 'Guardar Produtos'}
          </Button>
        </div>
      </CardContent>

      <CreateTelecomProductModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        existingNames={products.map(p => p.name)}
        onCreate={addProduct}
        isPending={updateOrg.isPending}
      />
    </Card>
  );
}
