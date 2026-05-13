import { LeadFieldsSettings, DEFAULT_LEAD_FIELDS_SETTINGS } from '@/types/field-settings';
import { useEntityFieldsSettings, useUpdateEntityFieldsSettings } from './useEntityFieldsSettings';

export function useLeadFieldsSettings() {
  return useEntityFieldsSettings<LeadFieldsSettings>('lead', DEFAULT_LEAD_FIELDS_SETTINGS);
}

export function useUpdateLeadFieldsSettings() {
  return useUpdateEntityFieldsSettings<LeadFieldsSettings>('lead');
}
