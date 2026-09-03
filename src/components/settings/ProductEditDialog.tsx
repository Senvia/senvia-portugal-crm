import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ProductCommissionFields } from './ProductCommissionFields';
import type { Operator } from '@/hooks/useOperators';
import { catalogProductKey, type CatalogProduct } from '@/types/proposals';

interface Member {
  user_id: string;
  full_name: string;
}

interface Profile {
  id: string;
  name: string;
}

interface ProductEditDialogProps {
  product: CatalogProduct | null;
  onOpenChange: (open: boolean) => void;
  operators: Operator[];
  members: Member[];
  profiles: Profile[];
  /** Local edit only (typing) — parent debounces the actual save to blur/select-change. Keyed by catalogProductKey, not name alone. */
  onChange: (key: string, updates: Partial<CatalogProduct>) => void;
  /** Persists immediately. Keyed by catalogProductKey, not name alone. */
  onCommit: (key: string, updates: Partial<CatalogProduct>) => void;
}

/**
 * Full editor for one catalog product (price, operator, commission rules),
 * opened from a compact row in ServicosProductsManager's list. Full-screen so
 * a product with several quantity bands — each with its own commission
 * lines — has room to breathe instead of scrolling inside a small card.
 */
export function ProductEditDialog({
  product,
  onOpenChange,
  operators,
  members,
  profiles,
  onChange,
  onCommit,
}: ProductEditDialogProps) {
  if (!product) return null;

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onOpenChange(false)}>
      <DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="shrink-0 border-b px-4 sm:px-6 py-4 pr-14">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            <DialogTitle className="text-base sm:text-lg">{product.name}</DialogTitle>
          </div>
          <DialogDescription>Preço, operadora e regras de comissão deste produto.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
          <ProductCommissionFields
            product={product}
            operators={operators}
            members={members}
            profiles={profiles}
            onChange={(updates) => onChange(catalogProductKey(product), updates)}
            onCommit={(updates) => onCommit(catalogProductKey(product), updates)}
          />
        </div>

        <div className="shrink-0 border-t px-4 sm:px-6 py-3 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
