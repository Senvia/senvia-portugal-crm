import { SaleFieldsSettings, DEFAULT_SALE_FIELDS_SETTINGS } from '@/types/field-settings';
import { useEntityFieldsSettings, useUpdateEntityFieldsSettings } from './useEntityFieldsSettings';

export function useSaleFieldsSettings() {
  return useEntityFieldsSettings<SaleFieldsSettings>('sale', DEFAULT_SALE_FIELDS_SETTINGS);
}

export function useUpdateSaleFieldsSettings() {
  return useUpdateEntityFieldsSettings<SaleFieldsSettings>('sale');
}
