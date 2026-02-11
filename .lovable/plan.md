

## Permissoes Granulares com Sub-areas e Acoes Especificas por Modulo

### Resumo

Expandir o sistema de permissoes atual (que apenas tem Ver/Editar/Eliminar por modulo) para incluir **sub-areas dentro de cada modulo**, cada uma com as suas proprias acoes especificas.

### Estrutura proposta

Cada modulo passa a ter sub-areas. Dentro de cada sub-area, ha acoes especificas que podem ser ativadas/desativadas.

```text
Modulo: Leads
  +-- Kanban / Lista
  |     [x] Ver   [x] Adicionar   [x] Editar   [ ] Eliminar   [x] Atribuir
  +-- Importar / Exportar
        [x] Exportar   [ ] Importar

Modulo: Clientes
  +-- Lista de Clientes
  |     [x] Ver   [x] Adicionar   [x] Editar   [ ] Eliminar
  +-- Comunicacoes
  |     [x] Ver   [x] Adicionar
  +-- CPEs
        [x] Ver   [x] Adicionar   [x] Editar   [ ] Eliminar

Modulo: Propostas
  +-- Propostas
        [x] Ver   [x] Criar   [x] Editar   [ ] Eliminar   [x] Enviar Email

Modulo: Vendas
  +-- Vendas
  |     [x] Ver   [x] Criar   [x] Editar   [ ] Eliminar
  +-- Pagamentos
        [x] Ver   [x] Adicionar

Modulo: Financas
  +-- Resumo
  |     [x] Ver
  +-- Faturas
  |     [x] Ver   [x] Emitir   [ ] Cancelar
  +-- Despesas
  |     [x] Ver   [x] Adicionar   [x] Editar   [ ] Eliminar
  +-- Pagamentos
  |     [x] Ver
  +-- Pedidos Internos
        [x] Ver   [x] Submeter   [x] Aprovar

Modulo: Agenda
  +-- Eventos
        [x] Ver   [x] Criar   [x] Editar   [ ] Eliminar

Modulo: Marketing
  +-- Templates
        [x] Ver   [x] Criar   [x] Editar   [ ] Eliminar   [x] Enviar

Modulo: E-commerce
  +-- Produtos
  |     [x] Ver   [x] Criar   [x] Editar   [ ] Eliminar
  +-- Pedidos
  |     [x] Ver   [x] Editar
  +-- Clientes
  |     [x] Ver   [x] Criar   [x] Editar
  +-- Inventario
  |     [x] Ver   [x] Editar
  +-- Descontos
        [x] Ver   [x] Criar   [x] Editar   [ ] Eliminar

Modulo: Definicoes
  +-- Geral
  |     [x] Ver   [x] Editar
  +-- Equipa
  |     [x] Ver   [x] Gerir
  +-- Pipeline
  |     [x] Ver   [x] Editar
  +-- Perfis
  |     [x] Ver   [x] Gerir
  +-- Modulos
        [x] Ver   [x] Editar
```

### Mudanca na estrutura de dados (JSONB)

A coluna `module_permissions` muda de formato:

**Antes:**
```text
{ "leads": { "view": true, "edit": true, "delete": false } }
```

**Depois:**
```text
{
  "leads": {
    "subareas": {
      "kanban": { "view": true, "add": true, "edit": true, "delete": false, "assign": true },
      "export": { "export": true, "import": false }
    }
  },
  "finance": {
    "subareas": {
      "summary": { "view": true },
      "invoices": { "view": true, "issue": true, "cancel": false },
      "expenses": { "view": true, "add": true, "edit": true, "delete": false },
      "payments": { "view": true },
      "requests": { "view": true, "submit": true, "approve": false }
    }
  }
}
```

Nao e necessaria migracao de BD -- a coluna ja e JSONB. Apenas o frontend muda para ler/escrever o novo formato. Para retrocompatibilidade, o codigo detecta o formato antigo e converte automaticamente.

### Ficheiros a alterar

**1. `src/hooks/useOrganizationProfiles.ts`**
- Redefinir as interfaces `ModulePermission` e `ModulePermissions` para suportar sub-areas com acoes
- Criar constantes com a definicao de sub-areas e acoes por modulo (metadata)
- Criar funcao de conversao do formato antigo para o novo
- Atualizar os defaults de cada perfil (admin, viewer, vendedor)

**2. `src/components/settings/ProfilesTab.tsx`**
- Redesenhar o modal de criar/editar perfil com layout acordeao:
  - Cada modulo e uma seccao colapsavel (Accordion)
  - Dentro, mostra as sub-areas como grupos
  - Cada sub-area mostra as suas acoes especificas como checkboxes
  - Toggle rapido "Ativar/Desativar Modulo" no header de cada acordeao
- Mobile-first: stack vertical com checkboxes compactos

**3. `src/hooks/usePermissions.ts`**
- Atualizar para ler o novo formato de permissoes
- Expor helper `can(module, subarea, action)` -- ex: `can('finance', 'invoices', 'issue')`
- Manter backward compatibility com o formato antigo

**4. Componentes que verificam permissoes**
- Atualizar gradualmente os componentes para usar `can()` em vez dos booleans antigos
- Prioridade: botoes de acao (criar, editar, eliminar) nos modulos principais

### UI do modal de perfil (redesenhado)

```text
+------------------------------------------+
| Criar Perfil                             |
+------------------------------------------+
| Nome: [Diretor Comercial          ]      |
| Role Base: [Administrador v]             |
+------------------------------------------+
| Permissoes                               |
|                                          |
| v Leads                    [Tudo] [Nada] |
| +--------------------------------------+ |
| | Kanban/Lista                         | |
| |   [x] Ver  [x] Adicionar            | |
| |   [x] Editar  [ ] Eliminar          | |
| |   [x] Atribuir                      | |
| +--------------------------------------+ |
| | Exportar                             | |
| |   [x] Exportar  [ ] Importar        | |
| +--------------------------------------+ |
|                                          |
| > Clientes                               |
| > Propostas                              |
| > Vendas                                 |
| > Financas                               |
| > ...                                    |
+------------------------------------------+
| [Cancelar]              [Criar]          |
+------------------------------------------+
```

### Retrocompatibilidade

- O formato antigo (`{ view, edit, delete }`) continua a funcionar
- Quando o sistema deteta o formato antigo, converte automaticamente para o novo
- Perfis existentes continuam a funcionar sem precisar de editar
- Ao guardar, o perfil e sempre guardado no formato novo

### Detalhes tecnicos

**Nao ha migracao de BD** -- o campo JSONB aceita qualquer estrutura. A mudanca e puramente no frontend.

**Funcao de conversao:**
- Se `module.subareas` existe -> formato novo, usar diretamente
- Se `module.view` existe -> formato antigo, converter: criar sub-areas com acoes mapeadas a partir dos booleans view/edit/delete

**Constante MODULE_SCHEMA** define a estrutura de cada modulo:
```text
MODULE_SCHEMA = {
  leads: {
    label: "Leads",
    subareas: {
      kanban: {
        label: "Kanban / Lista",
        actions: ["view", "add", "edit", "delete", "assign"]
      },
      export: {
        label: "Importar / Exportar",
        actions: ["export", "import"]
      }
    }
  },
  // ... etc
}
```

**Action labels** sao traduzidos: `view` -> "Ver", `add` -> "Adicionar", `edit` -> "Editar", etc.

