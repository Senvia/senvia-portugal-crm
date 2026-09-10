import { useMemo } from 'react';
import { useServicosProducts } from '@/hooks/useServicosProducts';
import { buildSaleTypeIds, type SaleTypeIdsResolver } from '@/lib/commission-filters';

/**
 * A resolver from a sale to the product-type ids on its lines, built off the
 * organization's catalog. Used by the commission filters (Vendas and
 * Financeiro) so a "Tipos" switch can keep or drop a sale.
 */
export function useSaleTypeIds(): SaleTypeIdsResolver {
  const { catalog } = useServicosProducts();
  return useMemo(() => buildSaleTypeIds(catalog ?? []), [catalog]);
}
