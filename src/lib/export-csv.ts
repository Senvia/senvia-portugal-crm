import * as XLSX from 'xlsx';

function csvText(value: string): string {
  return /^[\s\u0000-\u001f\u007f]*[=+@-]|^[\u0000-\u001f\u007f]/.test(value) ? `'${value}` : value;
}

export function buildExportCsv(data: readonly Record<string, unknown>[]): string {
  const headers = [...new Set(data.flatMap(row => Object.keys(row)))];
  const rows = data.map(row => headers.map(key => typeof row[key] === 'string' ? csvText(row[key]) : row[key]));
  const sheet = XLSX.utils.aoa_to_sheet([headers.map(csvText), ...rows]);
  return XLSX.utils.sheet_to_csv(sheet, { forceQuotes: true });
}
