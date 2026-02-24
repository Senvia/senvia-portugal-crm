import * as XLSX from 'xlsx';
import { format as formatDate } from 'date-fns';
import { pt } from 'date-fns/locale';
import type { Lead } from '@/types';
import type { CrmClient } from '@/types/clients';

// Status labels for clients
const CLIENT_STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  vip: 'VIP',
  prospect: 'Prospeto',
};

// Helper to format date for export
function formatExportDate(dateString: string | null | undefined): string {
  if (!dateString) return '';
  try {
    return formatDate(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: pt });
  } catch {
    return '';
  }
}

// Map leads data for export
export function mapLeadsForExport(leads: Lead[]) {
  return leads.map(lead => ({
    'Nome': lead.name,
    'Email': lead.email,
    'Telefone': lead.phone,
    'Status': lead.status || '',
    'Temperatura': lead.temperature || '',
    'Fonte': lead.source || '',
    'Valor': lead.value || 0,
    'Data de Criação': formatExportDate(lead.created_at),
  }));
}

// Map clients data for export
export function mapClientsForExport(clients: CrmClient[], isTelecom = false) {
  return clients.map(client => {
    const base: Record<string, unknown> = {
      'Código': client.code || '',
      'Nome': client.name,
      'Email': client.email || '',
      'Telefone': client.phone || '',
      'Empresa': client.company || '',
      'NIF': client.nif || '',
      'Estado': CLIENT_STATUS_LABELS[client.status || ''] || client.status || '',
      'Total Propostas': client.total_proposals || 0,
      'Total Vendas': client.total_sales || 0,
    };

    if (isTelecom) {
      base['Comissão'] = client.total_comissao || 0;
      base['MWh'] = client.total_mwh || 0;
      base['kWp'] = client.total_kwp || 0;
    } else {
      base['Valor Total'] = client.total_value || 0;
    }

    base['Data de Criação'] = formatExportDate(client.created_at);
    return base;
  });
}

// Helper to download file
function downloadFile(content: string | ArrayBuffer, filename: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Export to CSV
export function exportToCsv(data: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

// Export to Excel
export function exportToExcel(data: Record<string, unknown>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  
  // Auto-size columns based on content
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(
      key.length,
      ...data.map(row => String(row[key] ?? '').length)
    ) + 2
  }));
  ws['!cols'] = colWidths;
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
