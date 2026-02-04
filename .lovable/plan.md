

## Funcionalidade: Exportar Registos (CSV + Excel)

### Objetivo

Adicionar botões de exportação à barra de ações em massa para **Leads** e **Clientes**:
- **CSV** - Formato universal compatível com qualquer software
- **Excel (XLSX)** - Formato nativo para Excel com melhor formatação

---

### Ficheiros a Criar/Modificar

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/lib/export.ts` | Novo | Funções utilitárias de exportação |
| `src/components/shared/BulkActionsBar.tsx` | Modificar | Adicionar botões de exportação |
| `src/pages/Leads.tsx` | Modificar | Integrar handlers de exportação |
| `src/pages/Clients.tsx` | Modificar | Integrar handlers de exportação |

---

### Interface do Utilizador

A barra de ações em massa passará a mostrar:

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ☑ 5 selecionados  [Atribuir Colaborador]  [Exportar ▼]  [✕ Limpar]        │
└────────────────────────────────────────────────────────────────────────────┘
```

O botão **Exportar** abre um dropdown com:
- 📄 Exportar CSV
- 📊 Exportar Excel

---

### Dependência Nova

Para gerar ficheiros Excel nativos, será necessário instalar:
```bash
npm install xlsx
```

Esta biblioteca permite:
- Criar ficheiros .xlsx nativos
- Formatar células (cabeçalhos a negrito)
- Ajustar largura de colunas automaticamente

---

### Detalhes Técnicos

#### 1. src/lib/export.ts (Novo Ficheiro)

```typescript
import * as XLSX from 'xlsx';

// Mapear dados de Leads para exportação
export function mapLeadsForExport(leads: Lead[]) {
  return leads.map(lead => ({
    'Nome': lead.name,
    'Email': lead.email,
    'Telefone': lead.phone,
    'Status': lead.status,
    'Temperatura': lead.temperature,
    'Fonte': lead.source || '',
    'Valor': lead.value || 0,
    'Data de Criação': formatDate(lead.created_at),
  }));
}

// Mapear dados de Clientes para exportação
export function mapClientsForExport(clients: CrmClient[]) {
  return clients.map(client => ({
    'Código': client.code || '',
    'Nome': client.name,
    'Email': client.email || '',
    'Telefone': client.phone || '',
    'Empresa': client.company || '',
    'NIF': client.nif || '',
    'Estado': CLIENT_STATUS_LABELS[client.status],
    'Total Propostas': client.total_proposals,
    'Total Vendas': client.total_sales,
    'Valor Total': client.total_value,
    'Data de Criação': formatDate(client.created_at),
  }));
}

// Exportar para CSV
export function exportToCsv(data: Record<string, any>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(ws);
  downloadFile(csv, `${filename}.csv`, 'text/csv');
}

// Exportar para Excel
export function exportToExcel(data: Record<string, any>[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// Helper para download
function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
```

#### 2. BulkActionsBar.tsx (Modificações)

Novas props:
```typescript
interface BulkActionsBarProps {
  selectedCount: number;
  onAssignTeamMember: () => void;
  onExportCsv?: () => void;     // NOVO
  onExportExcel?: () => void;   // NOVO
  onClearSelection: () => void;
  entityLabel?: string;
}
```

Adicionar dropdown de exportação:
```tsx
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Dentro do componente:
{(onExportCsv || onExportExcel) && (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="secondary" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Exportar
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {onExportCsv && (
        <DropdownMenuItem onClick={onExportCsv}>
          <FileText className="h-4 w-4 mr-2" />
          Exportar CSV
        </DropdownMenuItem>
      )}
      {onExportExcel && (
        <DropdownMenuItem onClick={onExportExcel}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Exportar Excel
        </DropdownMenuItem>
      )}
    </DropdownMenuContent>
  </DropdownMenu>
)}
```

#### 3. Leads.tsx (Modificações)

Adicionar handlers de exportação:
```typescript
import { mapLeadsForExport, exportToCsv, exportToExcel } from '@/lib/export';
import { toast } from 'sonner';

// Dentro do componente:
const handleExportCsv = () => {
  const selectedLeads = filteredLeads.filter(l => selectedIds.includes(l.id));
  const data = mapLeadsForExport(selectedLeads);
  exportToCsv(data, `leads_${format(new Date(), 'yyyy-MM-dd')}`);
  toast.success(`${selectedLeads.length} leads exportados para CSV`);
};

const handleExportExcel = () => {
  const selectedLeads = filteredLeads.filter(l => selectedIds.includes(l.id));
  const data = mapLeadsForExport(selectedLeads);
  exportToExcel(data, `leads_${format(new Date(), 'yyyy-MM-dd')}`);
  toast.success(`${selectedLeads.length} leads exportados para Excel`);
};

// Na BulkActionsBar:
<BulkActionsBar
  selectedCount={selectedIds.length}
  onAssignTeamMember={() => setShowAssignModal(true)}
  onExportCsv={handleExportCsv}
  onExportExcel={handleExportExcel}
  onClearSelection={() => setSelectedIds([])}
  entityLabel="leads selecionados"
/>
```

#### 4. Clients.tsx (Modificações)

Mesmo padrão:
```typescript
import { mapClientsForExport, exportToCsv, exportToExcel } from '@/lib/export';

const handleExportCsv = () => {
  const selectedClients = filteredClients.filter(c => selectedIds.includes(c.id));
  const data = mapClientsForExport(selectedClients);
  exportToCsv(data, `clientes_${format(new Date(), 'yyyy-MM-dd')}`);
  toast.success(`${selectedClients.length} clientes exportados para CSV`);
};

const handleExportExcel = () => {
  const selectedClients = filteredClients.filter(c => selectedIds.includes(c.id));
  const data = mapClientsForExport(selectedClients);
  exportToExcel(data, `clientes_${format(new Date(), 'yyyy-MM-dd')}`);
  toast.success(`${selectedClients.length} clientes exportados para Excel`);
};
```

---

### Fluxo de Utilização

```text
1. Utilizador seleciona vários leads/clientes
2. Barra de ações aparece
3. Clica no botão "Exportar"
4. Dropdown mostra opções (CSV ou Excel)
5. Seleciona formato desejado
6. Ficheiro é gerado e descarregado automaticamente
7. Toast de sucesso confirma a exportação
```

---

### Campos Exportados

| Leads | Clientes |
|-------|----------|
| Nome | Código |
| Email | Nome |
| Telefone | Email |
| Status | Telefone |
| Temperatura | Empresa |
| Fonte | NIF |
| Valor | Estado |
| Data de Criação | Total Propostas |
| | Total Vendas |
| | Valor Total |
| | Data de Criação |

---

### Resumo de Implementação

| Componente | Ação |
|------------|------|
| `xlsx` (npm) | Instalar dependência |
| `src/lib/export.ts` | Criar (funções utilitárias) |
| `BulkActionsBar.tsx` | Modificar (dropdown exportação) |
| `Leads.tsx` | Modificar (handlers) |
| `Clients.tsx` | Modificar (handlers) |

**Total: 1 dependência + 1 novo ficheiro + 3 modificações**

