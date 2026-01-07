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
