import { useState, useMemo } from 'react';
import { useActiveEcommerceProducts } from '@/hooks/ecommerce/useEcommerceProducts';
import { useProductImages } from '@/hooks/ecommerce/useProductImages';
import { formatCurrency } from '@/lib/format';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Package, X, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EcommerceProduct } from '@/types/ecommerce';

interface InboxProductPickerProps {
  onSelectProduct: (product: EcommerceProduct) => void;
  onClose?: () => void;
  compact?: boolean;
  limit?: number;
}

/**
 * Individual product card for the picker grid.
 */
function ProductCard({
  product,
  imageUrl,
  onSelect,
}: {
  product: EcommerceProduct;
  imageUrl?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-all hover:border-primary/40 hover:shadow-sm"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-8 w-8" />
          </div>
        )}
        {product.price != null && (
          <span className="absolute bottom-1 right-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
            {formatCurrency(product.price)}
          </span>
        )}
      </div>
      <div className="p-1.5">
        <p className="truncate text-xs font-medium">{product.name}</p>
      </div>
    </button>
  );
}

/**
 * Wrapper that fetches images for a single product and renders a card.
 */
function ProductCardWithImage({
  product,
  onSelect,
}: {
  product: EcommerceProduct;
  onSelect: () => void;
}) {
  const { data: images = [] } = useProductImages(product.id);
  const primaryImage = images.find((img) => img.is_primary) ?? images[0];

  return <ProductCard product={product} imageUrl={primaryImage?.url} onSelect={onSelect} />;
}

/**
 * Full product picker — grid with search and category filter.
 */
export function InboxProductPicker({ onSelectProduct, onClose, limit }: InboxProductPickerProps) {
  const { data: products = [], isLoading } = useActiveEcommerceProducts();
  const [search, setSearch] = useState('');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Map<string, string>();
    for (const p of products) {
      if (p.category) {
        set.set(p.category.id, p.category.name);
      }
    }
    return Array.from(set.entries());
  }, [products]);

  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (categoryFilter) {
      list = list.filter((p) => p.category_id === categoryFilter);
    }
    return limit ? list.slice(0, limit) : list;
  }, [products, search, categoryFilter, limit]);

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="flex items-center gap-2 border-b p-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar produto..."
            className="h-8 pl-7 text-xs"
          />
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex gap-1 overflow-x-auto border-b p-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter(null)}
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] transition-colors',
              !categoryFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent',
            )}
          >
            Todos
          </button>
          {categories.map(([id, name]) => (
            <button
              key={id}
              type="button"
              onClick={() => setCategoryFilter(id)}
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[11px] transition-colors',
                categoryFilter === id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent',
              )}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {search || categoryFilter ? 'Nenhum produto encontrado.' : 'Sem produtos ativos.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
            {filtered.map((product) => (
              <ProductCardWithImage
                key={product.id}
                product={product}
                onSelect={() => onSelectProduct(product)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

/**
 * Compact collapsible product section for the contact panel.
 * Shows first 6 products + "ver todos" button.
 */
export function InboxProductSection({
  onSelectProduct,
}: {
  onSelectProduct: (product: EcommerceProduct) => void;
}) {
  const { data: products = [], isLoading } = useActiveEcommerceProducts();
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const displayProducts = useMemo(() => {
    return expanded ? products.slice(0, 6) : [];
  }, [products, expanded]);

  if (isLoading || products.length === 0) return null;

  return (
    <>
      <div className="rounded-xl border bg-card p-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            Produtos
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            {products.length} {products.length === 1 ? 'produto' : 'produtos'}
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </span>
        </button>

        {expanded && (
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {displayProducts.map((product) => (
              <ProductCardWithImage
                key={product.id}
                product={product}
                onSelect={() => onSelectProduct(product)}
              />
            ))}
          </div>
        )}

        {expanded && products.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-2 w-full rounded-lg border border-dashed py-1.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent"
          >
            Ver todos ({products.length})
          </button>
        )}
      </div>

      {showAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex h-[80vh] w-full max-w-md flex-col rounded-xl bg-background shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Produtos</h3>
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="rounded-md p-1 hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <InboxProductPicker
                onSelectProduct={(p) => {
                  onSelectProduct(p);
                  setShowAll(false);
                }}
                onClose={() => setShowAll(false)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
