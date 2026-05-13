import { ClientFieldsSettings, DEFAULT_CLIENT_FIELDS_SETTINGS } from '@/types/clients';
import { useEntityFieldsSettings, useUpdateEntityFieldsSettings } from './useEntityFieldsSettings';

export function useClientFieldsSettings() {
  return useEntityFieldsSettings<ClientFieldsSettings>('client', DEFAULT_CLIENT_FIELDS_SETTINGS);
}

export function useUpdateClientFieldsSettings() {
  return useUpdateEntityFieldsSettings<ClientFieldsSettings>('client');
}
