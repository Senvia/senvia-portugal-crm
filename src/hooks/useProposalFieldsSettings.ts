import { ProposalFieldsSettings, DEFAULT_PROPOSAL_FIELDS_SETTINGS } from '@/types/field-settings';
import { useEntityFieldsSettings, useUpdateEntityFieldsSettings } from './useEntityFieldsSettings';

export function useProposalFieldsSettings() {
  return useEntityFieldsSettings<ProposalFieldsSettings>('proposal', DEFAULT_PROPOSAL_FIELDS_SETTINGS);
}

export function useUpdateProposalFieldsSettings() {
  return useUpdateEntityFieldsSettings<ProposalFieldsSettings>('proposal');
}
