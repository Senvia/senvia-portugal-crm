// Senvia OS Type Definitions

export type AppRole = 'super_admin' | 'admin' | 'viewer';
export type LeadStatus = 'new' | 'contacted' | 'scheduled' | 'won' | 'lost';
export type OrganizationPlan = 'basic' | 'pro';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  public_key: string;
  plan: OrganizationPlan;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string | null;
  full_name: string;
  avatar_url?: string;
  created_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface Lead {
  id: string;
  organization_id: string;
  name: string;
  phone: string;
  email: string;
  status: LeadStatus;
  notes?: string;
  source?: string;
  value?: number;
  gdpr_consent: boolean;
  custom_data?: Record<string, string | number | boolean | string[] | null>;
  created_at: string;
  updated_at?: string;
}

// PT-PT Status Labels
export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contactado',
  scheduled: 'Agendado',
  won: 'Ganho',
  lost: 'Perdido',
};

// PT-PT Role Labels
export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Administrador',
  admin: 'Administrador',
  viewer: 'Visualizador',
};

// PT-PT Plan Labels
export const PLAN_LABELS: Record<OrganizationPlan, string> = {
  basic: 'Básico',
  pro: 'Profissional',
};

// Kanban column order
export const KANBAN_COLUMNS: LeadStatus[] = ['new', 'contacted', 'scheduled', 'won', 'lost'];

// Custom Field Types
export type FieldType = 'text' | 'number' | 'select' | 'checkbox' | 'textarea';

export interface CustomField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  order: number;
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: 'Texto',
  number: 'Número',
  select: 'Seleção',
  checkbox: 'Checkbox',
  textarea: 'Texto Longo',
};

export const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: 'Type',
  number: 'Hash',
  select: 'List',
  checkbox: 'CheckSquare',
  textarea: 'AlignLeft',
};

// Fixed Field Configuration
export interface FixedFieldConfig {
  visible: boolean;
  required: boolean;
  label: string;
}

// Form Settings Interface
export interface FormSettings {
  title: string;
  subtitle: string;
  logo_url: string | null;
  primary_color: string;
  fields: {
    name: FixedFieldConfig;
    email: FixedFieldConfig;
    phone: FixedFieldConfig;
    message: FixedFieldConfig;
  };
  success_message: {
    title: string;
    description: string;
  };
  error_message: string;
  custom_fields: CustomField[];
}

// Default Form Settings - TODOS os campos começam invisíveis
export const DEFAULT_FORM_SETTINGS: FormSettings = {
  title: 'Deixe o seu Contacto',
  subtitle: 'Preencha os dados abaixo e entraremos em contacto consigo.',
  logo_url: null,
  primary_color: '#3B82F6',
  fields: {
    name: { visible: false, required: false, label: 'Nome Completo' },
    email: { visible: false, required: false, label: 'Email' },
    phone: { visible: false, required: false, label: 'Telemóvel' },
    message: { visible: false, required: false, label: 'Mensagem' },
  },
  success_message: {
    title: 'Obrigado!',
    description: 'Recebemos o seu contacto e entraremos em contacto brevemente.',
  },
  error_message: 'Não foi possível enviar o formulário. Tente novamente.',
  custom_fields: [],
};

// Helper to migrate old settings format to new format
export function migrateFormSettings(settings: any): FormSettings {
  // If already in new format, return as-is
  if (settings?.fields?.name?.visible !== undefined) {
    return settings as FormSettings;
  }
  
  // Migrate from old format
  const oldLabels = settings?.labels || {};
  const showMessage = settings?.show_message_field ?? false;
  
  return {
    title: settings?.title || DEFAULT_FORM_SETTINGS.title,
    subtitle: settings?.subtitle || DEFAULT_FORM_SETTINGS.subtitle,
    logo_url: settings?.logo_url || null,
    primary_color: settings?.primary_color || DEFAULT_FORM_SETTINGS.primary_color,
    fields: {
      name: { visible: true, required: true, label: oldLabels.name || 'Nome Completo' },
      email: { visible: true, required: true, label: oldLabels.email || 'Email' },
      phone: { visible: true, required: true, label: oldLabels.phone || 'Telemóvel' },
      message: { visible: showMessage, required: false, label: oldLabels.message || 'Mensagem (opcional)' },
    },
    success_message: settings?.success_message || DEFAULT_FORM_SETTINGS.success_message,
    error_message: settings?.error_message || DEFAULT_FORM_SETTINGS.error_message,
    custom_fields: settings?.custom_fields || [],
  };
}
