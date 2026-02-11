import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
import { useCreateProduct } from '@/hooks/useProducts';

interface CreateProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TAX_OPTIONS = [
  { value: 'default', label: 'Usar taxa da organização', taxValue: null },
  { value: '23', label: 'IVA 23%', taxValue: 23 },
  { value: '13', label: 'IVA 13% (Intermédia)', taxValue: 13 },
  { value: '6', label: 'IVA 6% (Reduzida)', taxValue: 6 },
  { value: '0', label: 'Isento (0%)', taxValue: 0 },
];

export function CreateProductModal({ open, onOpenChange }: CreateProductModalProps) {
  const createProduct = useCreateProduct();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [taxOption, setTaxOption] = useState('default');
  const [taxExemptionReason, setTaxExemptionReason] = useState('');

  const selectedTax = TAX_OPTIONS.find(o => o.value === taxOption);

  const isExemptMissingReason = taxOption === '0' && !taxExemptionReason.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isExemptMissingReason) return;

    createProduct.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
      is_recurring: isRecurring,
      tax_value: selectedTax?.taxValue ?? null,
      tax_exemption_reason: taxOption === '0' ? taxExemptionReason.trim() || null : null,
    }, {
      onSuccess: () => {
        setName('');
        setDescription('');
        setPrice('');
        setIsRecurring(false);
        setTaxOption('default');
        setTaxExemptionReason('');
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Produto/Serviço</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Consulta Inicial"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do produto ou serviço"
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Preço Base (€)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          {/* Tax Selection */}
          <div className="space-y-2">
            <Label>Taxa IVA</Label>
            <Select value={taxOption} onValueChange={setTaxOption}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAX_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {taxOption === '0' && (
              <div className="space-y-1.5">
                <Label htmlFor="exemption" className="text-xs text-muted-foreground">Motivo de Isenção *</Label>
                <Input
                  id="exemption"
                  value={taxExemptionReason}
                  onChange={(e) => setTaxExemptionReason(e.target.value)}
                  placeholder="Ex: M10 - Artigo 53.º do CIVA"
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                <Label htmlFor="recurring" className="font-medium cursor-pointer">
                  Produto Recorrente
                </Label>
              </div>
              <Switch
                id="recurring"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>
            {isRecurring && (
              <p className="text-xs text-muted-foreground">
                Este produto é cobrado mensalmente. Vendas com este produto terão opção de renovação.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createProduct.isPending || !name.trim() || isExemptMissingReason}>
              {createProduct.isPending ? 'A criar...' : 'Criar Produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
