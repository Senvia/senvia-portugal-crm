import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useOrganization, useUpdateOrganization } from '@/hooks/useOrganization';
import { SERVICOS_PRODUCT_CONFIGS, FIELD_LABELS } from '@/types/proposals';
import type { Json } from '@/integrations/supabase/types';

const ALL_FIELDS = ['duracao', 'valor', 'kwp', 'comissao'] as const;

interface ProductConfig {
  name: string;
  fields: string[];
}

export function ServicosProductsManager() {
  const { data: org } = useOrganization();
  const updateOrg = useUpdateOrganization();
  const [products, setProducts] = useState<ProductConfig[]>([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const saved = (org as any)?.servicos_products_config as ProductConfig[] | null;
    if (saved && Array.isArray(saved) && saved.length > 0) {
      setProducts(saved);
    } else {
      // Initialize from defaults
      setProducts(SERVICOS_PRODUCT_CONFIGS.map(c => ({ name: c.name, fields: [...c.fields] })));
    }
  }, [org]);

  const handleSave = () => {
    updateOrg.mutate({ servicos_products_config: products as unknown as Json });
  };

  const addProduct = () => {
    if (!newName.trim()) return;
    if (products.some(p => p.name.toLowerCase() === newName.trim().toLowerCase())) return;
    setProducts(prev => [...prev, { name: newName.trim(), fields: ['valor', 'comissao'] }]);
    setNewName('');
  };

  const removeProduct = (name: string) => {
    setProducts(prev => prev.filter(p => p.name !== name));
  };

  const toggleField = (productName: string, field: string) => {
    setProducts(prev => prev.map(p => {
      if (p.name !== productName) return p;
      const has = p.fields.includes(field);
      return { ...p, fields: has ? p.fields.filter(f => f !== field) : [...p.fields, field] };
    }));
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Produtos Telecom (Serviços)
        </CardTitle>
        <CardDescription>
          Configure os produtos disponíveis para propostas e vendas de "Outros Serviços".
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {products.map((product) => (
          <div key={product.name} className="flex flex-col gap-2 p-3 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{product.name}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeProduct(product.name)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 pl-6">
              {ALL_FIELDS.map(field => (
                <label key={field} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox
                    checked={product.fields.includes(field)}
                    onCheckedChange={() => toggleField(product.name, field)}
                  />
                  {FIELD_LABELS[field] || field}
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex gap-2">
          <Input
            placeholder="Nome do novo produto..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addProduct()}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={addProduct} disabled={!newName.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={updateOrg.isPending} size="sm">
            {updateOrg.isPending ? 'A guardar...' : 'Guardar Produtos'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
