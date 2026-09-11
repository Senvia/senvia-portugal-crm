import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { buildExportCsv } from './export-csv.ts';

test('CSV neutralizes textual formulas and controls while preserving numeric values', () => {
  // Given
  const values = ['=1+1', '+351123', '-2+3', '@SUM(A1)', '\t=1', '\r=1', '\n=1', '  =1', '\u0000=1'];
  // When
  const csv = buildExportCsv(values.map(value => ({ value, amount: -42 })));
  const rows = XLSX.utils.sheet_to_json<string[]>(XLSX.read(csv, { type: 'string', raw: true }).Sheets.Sheet1, { header: 1 });
  // Then
  assert.deepEqual(rows.slice(1).map(row => row[0]), values.map(value => `'${value}`));
  assert.ok(rows.slice(1).every(row => row[1] === '-42'));
});

test('CSV round trips quoted separators and line breaks without creating new cells', () => {
  // Given
  const text = 'Name,"quoted"\n=not a new cell';
  // When
  const csv = buildExportCsv([{ name: text, normal: 'Alice', '=header': 'ok' }]);
  const rows = XLSX.utils.sheet_to_json<string[]>(XLSX.read(csv, { type: 'string', raw: true }).Sheets.Sheet1, { header: 1 });
  // Then
  assert.deepEqual(rows, [['name', 'normal', "'=header"], [text, 'Alice', 'ok']]);
});
