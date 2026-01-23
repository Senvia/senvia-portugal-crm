export type CpeStatus = 'active' | 'inactive' | 'pending' | 'returned';

export interface Cpe {
  id: string;
  organization_id: string;
  client_id: string;
  equipment_type: string;
  serial_number?: string | null;
  comercializador: string;
  fidelizacao_start?: string | null;
  fidelizacao_end?: string | null;
  status: CpeStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export const CPE_STATUS_LABELS: Record<CpeStatus, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  pending: 'Pendente',
  returned: 'Devolvido',
};

export const CPE_STATUS_STYLES: Record<CpeStatus, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-success/10', text: 'text-success', border: 'border-success/20' },
  inactive: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-muted' },
  pending: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  returned: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
};

// Common equipment types for telecom/energy
export const EQUIPMENT_TYPES = [
  'Router',
  'ONT',
  'Decoder/STB',
  'Repetidor WiFi',
  'Smart Meter',
  'Contador Elétrico',
  'Contador Gás',
  'Outro',
];

// Common comercializadores in Portugal
export const COMERCIALIZADORES = [
  // Telecom
  'MEO',
  'NOS',
  'Vodafone',
  'NOWO',
  'Digi',
  // Energy
  'EDP Comercial',
  'Galp',
  'Endesa',
  'Iberdrola',
  'Goldenergy',
  'Luzboa',
  'Outro',
];
