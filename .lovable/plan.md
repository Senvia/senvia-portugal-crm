

## Funcionalidade: Seleção em Massa + Ações (Todos os Nichos)

### Objetivo

Adicionar a capacidade de **selecionar múltiplos leads/clientes** e realizar ações em massa:
1. **Associar Colaborador** - Atribuir registos a um membro da equipa
2. **Exportar CSV** - Exportar registos selecionados (preparação para futuro)

Esta funcionalidade será disponível para **TODOS os nichos/templates**.

### Caso de Uso Principal

> "Sai um colaborador e queremos atribuir os leads/clientes dele a outro para dar continuidade ao trabalho."

---

### Ficheiros a Criar/Modificar

| Ficheiro | Tipo | Descrição |
|----------|------|-----------|
| `src/components/shared/BulkActionsBar.tsx` | Novo | Barra de ações em massa reutilizável |
| `src/components/shared/AssignTeamMemberModal.tsx` | Novo | Modal para selecionar colaborador |
| `src/hooks/useBulkAssign.ts` | Novo | Hook para atualização em massa |
| `src/components/leads/LeadsTableView.tsx` | Modificar | Adicionar checkboxes de seleção |
| `src/components/clients/ClientsTable.tsx` | Modificar | Adicionar checkboxes de seleção |
| `src/pages/Leads.tsx` | Modificar | Gerir estado de seleção e ações |
| `src/pages/Clients.tsx` | Modificar | Gerir estado de seleção e ações |

---

### Interface do Utilizador

#### 1. Tabela com Checkboxes

```text
┌────┬────────────────────────────────────────────────────┐
│ ☐  │ Cliente           │ Contacto  │ Estado  │ ...     │
├────┼────────────────────────────────────────────────────┤
│ ☐  │ João Silva        │ 91X...    │ Ativo   │ ...     │
│ ☑  │ Maria Santos      │ 92X...    │ VIP     │ ...     │
│ ☑  │ Pedro Costa       │ 93X...    │ Ativo   │ ...     │
└────┴────────────────────────────────────────────────────┘
```

- Checkbox no cabeçalho para selecionar/desselecionar todos
- Checkbox por linha para seleção individual
- Click na linha continua a abrir detalhes (checkbox não interfere)

#### 2. Barra de Ações em Massa (Aparece quando há seleção)

```text
┌───────────────────────────────────────────────────────────────────┐
│ ☑ 3 selecionados    [Atribuir Colaborador]  [Exportar]  [✕]      │
└───────────────────────────────────────────────────────────────────┘
```

- Posição: Fixa no topo da tabela
- Mostra quantidade selecionada
- Botões: "Atribuir Colaborador", "Exportar CSV" (futuro), "Limpar"
- Animação suave de entrada/saída

#### 3. Modal "Atribuir Colaborador"

```text
┌──────────────────────────────────────────┐
│       Atribuir Colaborador               │
│                                          │
│  Selecione o colaborador para atribuir   │
│  a 3 registos selecionados:              │
│                                          │
│  [▼ Selecionar colaborador        ]      │
│                                          │
│  ○ Carlos Mendes                         │
│  ○ Ana Costa                             │
│  ○ Nenhum (Remover atribuição)           │
│                                          │
│  [Cancelar]              [Confirmar]     │
└──────────────────────────────────────────┘
```

---

### Detalhes Técnicos

#### 1. BulkActionsBar.tsx (Novo Componente)

```typescript
interface BulkActionsBarProps {
  selectedCount: number;
  onAssignTeamMember: () => void;
  onExportCsv?: () => void;  // Opcional por agora
  onClearSelection: () => void;
}
```

Características:
- Animação com Framer Motion
- Design responsivo (stack vertical em mobile)
- Cores consistentes com dark mode

#### 2. AssignTeamMemberModal.tsx (Novo Componente)

```typescript
interface AssignTeamMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  entityType: 'leads' | 'clients';
  onSuccess: () => void;
}
```

Funcionalidade:
- Lista membros da equipa via `useTeamMembers`
- Opção "Nenhum" para remover atribuição
- Loading state durante atualização

#### 3. useBulkAssign.ts (Novo Hook)

```typescript
export function useBulkAssignLeads() {
  return useMutation({
    mutationFn: async ({ 
      leadIds, 
      assignedTo 
    }: { 
      leadIds: string[]; 
      assignedTo: string | null;
    }) => {
      const { error } = await supabase
        .from('leads')
        .update({ assigned_to: assignedTo })
        .in('id', leadIds);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });
}

export function useBulkAssignClients() {
  // Mesmo padrão para crm_clients
}
```

#### 4. LeadsTableView.tsx (Modificações)

Novas props:
```typescript
interface LeadsTableViewProps {
  leads: Lead[];
  // ... props existentes
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}
```

Alterações:
- Coluna de checkbox no início
- Header checkbox para "selecionar todos"
- Checkbox por linha (não interfere com click na linha)

#### 5. ClientsTable.tsx (Modificações)

Mesmo padrão:
- Props de seleção
- Checkboxes na primeira coluna
- Handler de toggle individual/todos

#### 6. Leads.tsx e Clients.tsx (Modificações)

Novo estado e handlers:
```typescript
const [selectedIds, setSelectedIds] = useState<string[]>([]);
const [showAssignModal, setShowAssignModal] = useState(false);

// Limpar seleção quando filtros mudam
useEffect(() => {
  setSelectedIds([]);
}, [filters, search]);
```

---

### Fluxo de Utilização

```text
1. Utilizador abre página de Leads ou Clientes
2. Vê coluna de checkboxes
3. Seleciona múltiplos registos
4. Barra de ações aparece no topo
5. Clica "Atribuir Colaborador"
6. Modal abre com lista de colaboradores
7. Seleciona colaborador
8. Confirma
9. Registos atualizados + toast de sucesso
10. Seleção limpa automaticamente
```

---

### Condições e Permissões

| Condição | Comportamento |
|----------|---------------|
| Todos os nichos | Checkboxes visíveis |
| `selectedIds.length > 0` | Barra de ações visível |
| `isAdmin` | Pode usar "Atribuir Colaborador" |
| Filtros/pesquisa alterados | Seleção limpa automaticamente |

---

### Preparação para Exportar CSV

A estrutura já suporta adicionar exportação:

```typescript
<BulkActionsBar
  selectedCount={selectedIds.length}
  onAssignTeamMember={() => setShowAssignModal(true)}
  onExportCsv={() => handleExportCsv(selectedIds)} // Implementar depois
  onClearSelection={handleClearSelection}
/>
```

---

### Resumo de Implementação

| Componente | Ação |
|------------|------|
| `BulkActionsBar.tsx` | Criar |
| `AssignTeamMemberModal.tsx` | Criar |
| `useBulkAssign.ts` | Criar |
| `LeadsTableView.tsx` | Modificar (checkboxes) |
| `ClientsTable.tsx` | Modificar (checkboxes) |
| `Leads.tsx` | Modificar (estado seleção) |
| `Clients.tsx` | Modificar (estado seleção) |

**Total: 3 novos ficheiros + 4 modificações**

