import { NicheType } from './pipeline-templates';

export interface NicheLabels {
  singular: string;
  plural: string;
  since: string;
  new: string;
  vip: string;
  total: string;
  active: string;
  inactive: string;
  moduleName: string;
}

export const NICHE_CLIENT_LABELS: Record<NicheType, NicheLabels> = {
  generic: {
    singular: 'Cliente',
    plural: 'Clientes',
    since: 'Cliente desde',
    new: 'Novo Cliente',
    vip: 'Clientes VIP',
    total: 'Total Clientes',
    active: 'Clientes Ativos',
    inactive: 'Clientes Inativos',
    moduleName: 'Clientes',
  },
  clinic: {
    singular: 'Paciente',
    plural: 'Pacientes',
    since: 'Paciente desde',
    new: 'Novo Paciente',
    vip: 'Pacientes VIP',
    total: 'Total Pacientes',
    active: 'Pacientes Ativos',
    inactive: 'Pacientes Inativos',
    moduleName: 'Pacientes',
  },
  construction: {
    singular: 'Cliente',
    plural: 'Clientes',
    since: 'Cliente desde',
    new: 'Novo Cliente',
    vip: 'Clientes VIP',
    total: 'Total Clientes',
    active: 'Clientes Ativos',
    inactive: 'Clientes Inativos',
    moduleName: 'Clientes',
  },
  telecom: {
    singular: 'Cliente',
    plural: 'Clientes',
    since: 'Cliente desde',
    new: 'Novo Cliente',
    vip: 'Clientes VIP',
    total: 'Total Clientes',
    active: 'Clientes Ativos',
    inactive: 'Clientes Inativos',
    moduleName: 'Clientes',
  },
  ecommerce: {
    singular: 'Cliente',
    plural: 'Clientes',
    since: 'Cliente desde',
    new: 'Novo Cliente',
    vip: 'Clientes VIP',
    total: 'Total Clientes',
    active: 'Clientes Ativos',
    inactive: 'Clientes Inativos',
    moduleName: 'Clientes',
  },
  real_estate: {
    singular: 'Cliente',
    plural: 'Clientes',
    since: 'Cliente desde',
    new: 'Novo Cliente',
    vip: 'Clientes VIP',
    total: 'Total Clientes',
    active: 'Clientes Ativos',
    inactive: 'Clientes Inativos',
    moduleName: 'Clientes',
  },
};

export function getClientLabels(niche: NicheType | string | null | undefined): NicheLabels {
  const validNiche = niche as NicheType;
  return NICHE_CLIENT_LABELS[validNiche] || NICHE_CLIENT_LABELS.generic;
}
