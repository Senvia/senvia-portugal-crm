import { useMemo } from 'react';
import { useOrganization } from '@/hooks/useOrganization';
import { SERVICOS_PRODUCTS, SERVICOS_PRODUCT_CONFIGS, type ServicosProductConfig } from '@/types/proposals';

interface ServicosProductConfigFromDB {
  name: string;
  fields: string[];
}

/**
 * Returns the list of servicos products and their field configs.
 * If the organization has a custom `servicos_products_config`, use that.
 * Otherwise, fall back to the hardcoded defaults.
 */
export function useServicosProducts() {
  const { data: org } = useOrganization();

  return useMemo(() => {
    const config = (org as any)?.servicos_products_config as ServicosProductConfigFromDB[] | null;

    if (!config || !Array.isArray(config) || config.length === 0) {
      return {
        products: SERVICOS_PRODUCTS,
        configs: SERVICOS_PRODUCT_CONFIGS,
      };
    }

    const products = config.map((c) => c.name);
    const configs: ServicosProductConfig[] = config.map((c) => ({
      name: c.name,
      fields: c.fields as ServicosProductConfig['fields'],
    }));

    return { products, configs };
  }, [org]);
}
