

## Criar Perfil "CE" (Coordenador de Equipa)

### Resumo

Inserir via migracao SQL um novo perfil "CE" em ambas as organizacoes existentes, com permissoes granulares no novo formato e `data_scope = 'team'`.

### Perfil CE - Definicao

| Campo | Valor |
|-------|-------|
| Nome | CE |
| Role Base | salesperson |
| Visibilidade | team (ve dados proprios + equipa) |
| Default | false |

### Permissoes Granulares

| Modulo | Sub-area | Acoes permitidas |
|--------|----------|-----------------|
| Leads | Kanban | ver, adicionar, editar, atribuir |
| Leads | Exportar | ver, exportar |
| Clientes | Lista | ver, adicionar, editar |
| Clientes | Comunicacoes | ver, adicionar |
| Clientes | CPEs | ver |
| Propostas | Propostas | ver, criar, editar, enviar |
| Vendas | Vendas | ver, criar, editar |
| Vendas | Pagamentos | ver, adicionar |
| Financas | Resumo | ver |
| Financas | Faturas | ver |
| Financas | Despesas | ver |
| Financas | Pagamentos | ver |
| Financas | Pedidos | ver |
| Agenda | Eventos | ver, criar, editar |
| Marketing | Templates | nao |
| E-commerce | * | nao |
| Definicoes | * | nao |

### Implementacao

**1 ficheiro**: Uma migracao SQL que insere o perfil CE para cada organizacao existente com as permissoes granulares completas no formato JSON correto (modulo > subareas > acoes).

A migracao usa o formato granular:
```json
{
  "leads": {
    "subareas": {
      "kanban": { "view": true, "add": true, "edit": true, "delete": false, "assign": true },
      "export": { "export": true, "import": false }
    }
  },
  ...
}
```

Isto garante que o perfil CE aparece imediatamente na lista de perfis de todas as organizacoes, pronto a ser atribuido a membros da equipa.

