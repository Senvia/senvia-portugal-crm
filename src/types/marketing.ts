export interface EmailTemplate {
  id: string;
  organization_id: string;
  name: string;
  subject: string;
  html_content: string;
  category: EmailTemplateCategory;
  variables: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export type EmailTemplateCategory = 'general' | 'proposal' | 'welcome' | 'followup' | 'promotion';

export const TEMPLATE_CATEGORIES: Record<EmailTemplateCategory, string> = {
  general: 'Geral',
  proposal: 'Propostas',
  welcome: 'Boas-vindas',
  followup: 'Follow-up',
  promotion: 'Promoção',
};

export const TEMPLATE_VARIABLES = [
  { key: '{{nome}}', label: 'Nome do contacto' },
  { key: '{{email}}', label: 'Email do contacto' },
  { key: '{{empresa}}', label: 'Nome da empresa' },
  { key: '{{telefone}}', label: 'Telefone' },
  { key: '{{data}}', label: 'Data atual' },
  { key: '{{organizacao}}', label: 'Nome da organização' },
] as const;
