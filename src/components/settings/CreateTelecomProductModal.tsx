import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
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
 * (organizations.servicos_products_config). Persisting is the caller's job.
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
  const [hasCommission, setHasCommission] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [commission, setCommission] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
    setPrice('');
    setHasCommission(false);
    setIsFixed(false);
    setCommission('');
  }, [open]);

  const trimmed = name.trim();
  const isDuplicate = existingNames.some((n) => n.toLowerCase() === trimmed.toLowerCase());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || isDuplicate) return;

    const value = parseFloat(commission) || 0;
    onCreate({
      name: trimmed,
      price: parseFloat(price) || 0,
      has_commission: hasCommission,
      commission_type: isFixed ? 'fixed' : 'pct',
      commission_pct: hasCommission && !isFixed ? value : 0,
      commission_fixed: hasCommission && isFixed ? value : 0,
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

          <div className="rounded-lg border bg-primary/5 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <Label htmlFor="telecom-has-commission" className="font-medium cursor-pointer">
                  Tem Comissão?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Valor pago ao comercial por cada unidade vendida.
                </p>
              </div>
              <Switch
                id="telecom-has-commission"
                checked={hasCommission}
                onCheckedChange={setHasCommission}
              />
            </div>

            {hasCommission && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="telecom-commission" className="text-xs text-muted-foreground">
                    {isFixed ? 'Comissão (€)' : 'Comissão (%)'}
                  </Label>
                  <div className="flex overflow-hidden rounded-md border">
                    <button
                      type="button"
                      onClick={() => setIsFixed(false)}
                      className={cn(
                        'px-2 py-0.5 text-[11px] leading-5 transition-colors',
                        !isFixed ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsFixed(true)}
                      className={cn(
                        'px-2 py-0.5 text-[11px] leading-5 transition-colors',
                        isFixed ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      €
                    </button>
                  </div>
                </div>
                <Input
                  id="telecom-commission"
                  type="number"
                  step={isFixed ? '0.01' : '0.1'}
                  min="0"
                  max={isFixed ? undefined : '100'}
                  value={commission}
                  onChange={(e) => setCommission(e.target.value)}
                  placeholder={isFixed ? '0.00' : '0'}
                />
              </div>
            )}
          </div>

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
