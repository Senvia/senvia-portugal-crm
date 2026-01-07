// Senvia OS Type Definitions

export type LeadStatus = 'new' | 'conversation' | 'scheduled' | 'sold' | 'lost';

export interface Organization {
  id: string;
  name: string;
  plan: 'starter' | 'professional' | 'enterprise';
  public_api_key: string;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  role: 'admin' | 'manager' | 'user';
  full_name: string;
  avatar_url?: string;
  email: string;
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
  new: 'Novos',
  conversation: 'Em Conversação',
  scheduled: 'Agendado',
  sold: 'Vendido',
  lost: 'Perdido',
};

// PT-PT Role Labels
export const ROLE_LABELS: Record<Profile['role'], string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  user: 'Utilizador',
};

// PT-PT Plan Labels
export const PLAN_LABELS: Record<Organization['plan'], string> = {
  starter: 'Inicial',
  professional: 'Profissional',
  enterprise: 'Empresarial',
};
