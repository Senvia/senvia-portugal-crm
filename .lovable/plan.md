

## Expandir Secção "Campos" com Tabs por Módulo

### Problema Atual

A secção Definições > Definições Gerais > Campos mostra apenas o `ClientFieldsEditor` (campos de Clientes). Nao existe forma de configurar campos para Leads, Propostas ou Vendas.

### Solucao

Transformar a secção "Campos" numa pagina com **Tabs** (abas) para cada modulo do sistema, permitindo configurar os campos de cada entidade separadamente.

### Tabs Previstas

1. **Leads** - Campos do formulario de adicionar lead (Nome, Email, Telefone, Origem, Temperatura, Valor, Observacoes, etc.)
2. **Clientes** - Ja existe (`ClientFieldsEditor`) - manter como esta
3. **Propostas** - Campos de criacao de proposta (Tipo, Valor, Notas, etc.)
4. **Vendas** - Campos de criacao de venda (Valor, Metodo Pagamento, Notas, etc.)

### Implementacao Tecnica

**1. Novo componente wrapper: `src/components/settings/FieldsManagerTabs.tsx`**

- Usa o componente `Tabs` do Radix UI (ja instalado)
- 4 tabs: Leads, Clientes, Propostas, Vendas
- Cada tab carrega o seu editor de campos especifico
- Tab "Clientes" reutiliza o `ClientFieldsEditor` existente

**2. Novos tipos: `src/types/field-settings.ts`**

- Definir tipos genericos para configuracao de campos por modulo (LeadFieldsSettings, ProposalFieldsSettings, SaleFieldsSettings)
- Cada tipo tem a mesma estrutura: `{ [campo]: { visible, required, label } }`
- Defaults pre-definidos para cada modulo

**3. Novos hooks:**

- `src/hooks/useLeadFieldsSettings.ts` - Le/grava configuracoes de campos de leads na tabela `organizations` (coluna `lead_fields_settings` JSONB)
- `src/hooks/useProposalFieldsSettings.ts` - Idem para propostas (`proposal_fields_settings`)
- `src/hooks/useSaleFieldsSettings.ts` - Idem para vendas (`sale_fields_settings`)

**4. Novos editores de campos:**

- `src/components/settings/LeadFieldsEditor.tsx` - Mesmo padrao do ClientFieldsEditor, com os campos do lead (nome, email, telefone, origem, temperatura, valor_estimado, observacoes)
- `src/components/settings/ProposalFieldsEditor.tsx` - Campos de proposta (tipo, valor, notas, etc.)
- `src/components/settings/SaleFieldsEditor.tsx` - Campos de venda (valor, metodo_pagamento, notas, etc.)

**5. Migracao de base de dados:**

- Adicionar 3 novas colunas JSONB a tabela `organizations`:
  - `lead_fields_settings` (JSONB, default NULL)
  - `proposal_fields_settings` (JSONB, default NULL)
  - `sale_fields_settings` (JSONB, default NULL)

**6. Atualizar Settings.tsx:**

- Na secao `org-fields`, trocar `<ClientFieldsEditor />` por `<FieldsManagerTabs />`

**7. Atualizar MobileSettingsNav.tsx:**

- Alterar descricao de "Campos personalizados" para "Campos por modulo (Leads, Clientes, etc.)"

### Estrutura de cada editor

Cada editor segue o mesmo padrao visual do `ClientFieldsEditor`:
- Lista de campos com icone, input de label editavel
- Toggle de visibilidade (olho)
- Toggle de obrigatoriedade (asterisco)
- Botao "Guardar Alteracoes"
- Validacao (pelo menos um campo de identificacao visivel/obrigatorio)

### Campos por Modulo

**Leads:**
- Nome (obrigatorio por defeito)
- Email
- Telefone
- Origem
- Temperatura
- Valor Estimado
- Observacoes

**Propostas:**
- Tipo de Proposta
- Valor Total
- Data da Proposta
- Notas

**Vendas:**
- Valor Total
- Metodo de Pagamento
- Data de Vencimento
- Notas

### Ficheiros Criados/Alterados

- `src/components/settings/FieldsManagerTabs.tsx` (novo)
- `src/components/settings/LeadFieldsEditor.tsx` (novo)
- `src/components/settings/ProposalFieldsEditor.tsx` (novo)
- `src/components/settings/SaleFieldsEditor.tsx` (novo)
- `src/types/field-settings.ts` (novo)
- `src/hooks/useLeadFieldsSettings.ts` (novo)
- `src/hooks/useProposalFieldsSettings.ts` (novo)
- `src/hooks/useSaleFieldsSettings.ts` (novo)
- `src/pages/Settings.tsx` (alterado - trocar ClientFieldsEditor por FieldsManagerTabs)
- `src/components/settings/MobileSettingsNav.tsx` (alterado - atualizar descricao)
- Migracao SQL (nova - adicionar colunas JSONB)

