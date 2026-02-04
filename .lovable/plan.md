## Funcionalidade: Seleção em Massa + Atribuir Colaborador ✅ CONCLUÍDO

### Implementação Completa

A funcionalidade de **selecionar múltiplos leads/clientes** e **atribuir colaborador** foi implementada com sucesso para **todos os nichos/templates**.

---

### Ficheiros Criados

| Ficheiro | Descrição |
|----------|-----------|
| `src/components/shared/BulkActionsBar.tsx` | Barra de ações em massa com animação Framer Motion |
| `src/components/shared/AssignTeamMemberModal.tsx` | Modal para selecionar colaborador |
| `src/hooks/useBulkAssign.ts` | Hook para atualização em massa (leads e clientes) |

---

### Ficheiros Modificados

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/leads/LeadsTableView.tsx` | Adicionada coluna de checkboxes com seleção individual e "selecionar todos" |
| `src/components/clients/ClientsTable.tsx` | Adicionada coluna de checkboxes com seleção individual e "selecionar todos" |
| `src/pages/Leads.tsx` | Estado de seleção + integração com BulkActionsBar e modal (apenas em modo tabela) |
| `src/pages/Clients.tsx` | Estado de seleção + integração com BulkActionsBar e modal |

---

### Funcionalidades Implementadas

1. ✅ Checkboxes por linha para seleção individual
2. ✅ Checkbox no cabeçalho para selecionar/desselecionar todos
3. ✅ Barra de ações animada aparece ao selecionar
4. ✅ Modal para atribuir colaborador com lista de membros da equipa
5. ✅ Opção "Nenhum" para remover atribuição
6. ✅ Limpeza automática de seleção ao mudar filtros
7. ✅ Toast de sucesso após atribuição
8. ✅ Disponível para todos os nichos

---

### Próximos Passos (Preparado)

A estrutura já suporta adicionar **Exportar CSV**:

```typescript
<BulkActionsBar
  onExportCsv={() => handleExportCsv(selectedIds)} // A implementar
/>
```
