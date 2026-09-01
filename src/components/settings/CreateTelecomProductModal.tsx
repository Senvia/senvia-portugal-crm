import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CatalogProduct } from '@/types/proposals';

interface CreateTelecomProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names already in the catalog, to reject duplicates. */
  existingNames: string[];
  onCreate: (product: CatalogProduct) => void;
  isPending?: boolean;
}

/**
 * Creates one entry of the "Outros Serviços" catalog
 * (organizations.servicos_products_config). Commission lines are added
 * afterwards on the product card, not here — persisting is the caller's job.
 */
export function CreateTelecomProductModal({
  open,
  onOpenChange,
  existingNames,
  onCreate,
  isPending,
}: CreateTelecomProductModalProps) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setPrice('');
  }, [open]);

  const trimmed = name.trim();
  const isDuplicate = existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || isDuplicate) return;

    onCreate({
      name: trimmed,
      price: parseFloat(price) || 0,
      has_commission: false,
      commission_pct: 0,
      commission_fixed: 0,
      splits: [],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Produto Telecom</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="telecom-name">Nome *</Label>
            <Input
              id="telecom-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: 3P - 34 a 42"
              autoFocus
            />
            {isDuplicate && (
              <p className="text-xs text-destructive">Já existe um produto com este nome.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="telecom-price">Preço Base (€)</Label>
            <Input
              id="telecom-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            As comissões deste produto adicionam-se depois de criado, no cartão do produto.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!trimmed || isDuplicate || isPending}>
              {isPending ? 'A criar...' : 'Criar Produto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
