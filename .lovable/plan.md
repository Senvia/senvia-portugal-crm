

## Mover Automação para dentro do Template (eliminar página de Automações)

### Conceito
Em vez de uma página separada de automações, a automação será uma secção dentro dos modais de **criar** e **editar template**. Um switch "Ativar Automação" revela os campos de gatilho e atraso. O email é enviado diretamente para o contacto que disparou o gatilho (lead, cliente, etc.) — sem necessidade de lista.

### Alterações

**1. Base de dados** — Adicionar colunas à tabela `email_templates`:
- `automation_enabled` (boolean, default false)
- `automation_trigger_type` (text, nullable)
- `automation_trigger_config` (jsonb, default '{}')
- `automation_delay_minutes` (integer, default 0)

**2. Edge function `process-automation/index.ts`** — Alterar para buscar templates com `automation_enabled = true` em vez de buscar na tabela `email_automations`. O email é enviado diretamente para o contacto que disparou o gatilho (ex: o lead que mudou de status), usando `record.email` e `record.name`.

**3. Trigger da base de dados `notify_automation_trigger()`** — Atualizar para chamar a nova lógica (buscar templates diretamente).

**4. `CreateTemplateModal.tsx` e `EditTemplateModal.tsx`** — Adicionar secção de automação:
- Switch "Ativar Automação"
- Select de gatilho (reutilizar `TRIGGER_TYPES` do `useAutomations.ts`)
- Selects condicionais de "De/Para estado" (quando aplicável)
- Select de atraso

**5. Remover ficheiros**:
- `src/pages/marketing/Automations.tsx`
- `src/components/marketing/AutomationsTable.tsx`
- `src/components/marketing/CreateAutomationModal.tsx`

**6. Limpar referências**:
- `src/App.tsx` — Remover rota `/marketing/automations` e lazy import
- `src/pages/Marketing.tsx` — Remover card "Automações" do hub
- `src/hooks/useAutomations.ts` — Manter apenas os exports de `TRIGGER_TYPES`, `DELAY_OPTIONS`, etc. Remover CRUD de `email_automations`

**7. `useEmailTemplates.ts`** — Atualizar `CreateEmailTemplateData` e `UpdateEmailTemplateData` para incluir os novos campos de automação.

### Detalhes de implementação

A secção de automação no modal ficará assim:
```text
┌─────────────────────────────────────┐
│ ⚡ Automação                        │
│ ┌─────────────────────────────────┐ │
│ │ Ativar Automação         [  o ] │ │
│ └─────────────────────────────────┘ │
│ (visível quando ativo):             │
│  Gatilho: [Lead Muda de Etapa  ▾]  │
│  De: [Qualquer ▾]  Para: [Ganho ▾] │
│  Atraso: [Imediato ▾]              │
└─────────────────────────────────────┘
```

O email será enviado para o contacto que disparou o gatilho (`record.email`/`record.name`), não para uma lista separada.

