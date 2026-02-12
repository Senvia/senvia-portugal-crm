
# Financeiro: 2 Sub-modulos (Tipos de Despesas + Fiscal)

## Resumo

O grupo "Financeiro" passa de conteudo direto (apenas ExpenseCategoriesTab) para ter **2 sub-modulos**:

| Sub-modulo | Conteudo |
|---|---|
| Tipos de Despesas | `ExpenseCategoriesTab` (sem alteracoes) |
| Fiscal | Novo componente `FiscalSettingsTab` com: taxa de IVA global da organizacao, motivo de isencao, e taxa de IVA por defeito para produtos |

## O que muda

### 1. Remover configuracao fiscal das Integracoes

Nas seccoes InvoiceXpress e KeyInvoice do `IntegrationsContent.tsx`, remover os campos de "Taxa de IVA" e "Motivo de Isencao" (linhas 535-583 e 674-722). Estas integracoes passam a guardar **apenas credenciais** (account name, API key, URL). A `tax_config` passa a ser guardada exclusivamente pelo novo componente Fiscal.

Os handlers `handleSaveInvoiceXpress` e `handleSaveKeyInvoice` no `Settings.tsx` deixam de incluir `tax_config` no mutate -- apenas guardam credenciais.

### 2. Remover selecao de IVA por produto dos modais de Produto

Nos ficheiros `CreateProductModal.tsx` e `EditProductModal.tsx`, remover o campo "Taxa IVA" (select com opcoes "Usar taxa da organizacao", "IVA 23%", etc.) e o campo de motivo de isencao. Os produtos passam a usar **sempre** a taxa global da organizacao (definida no novo sub-modulo Fiscal). Os campos `tax_value` e `tax_exemption_reason` ficam como `null` ao criar/editar.

### 3. Novo componente `FiscalSettingsTab`

Ficheiro: `src/components/settings/FiscalSettingsTab.tsx`

Conteudo:
- Card "Configuracao Fiscal"
  - Select de Taxa de IVA global (23%, 13%, 6%, Isento)
  - Campo de Motivo de Isencao (condicional, visivel quando taxa = 0)
  - Nota informativa: "Esta taxa sera aplicada a todos os produtos e faturas por defeito"
  - Botao "Guardar" que persiste em `organizations.tax_config`

O componente recebe como props: `taxRate`, `setTaxRate`, `taxExemptionReason`, `setTaxExemptionReason`, `onSave`, `isPending`.

### 4. Atualizar navegacao

**`MobileSettingsNav.tsx`:**
- Remover `"finance"` do array `directContentGroups` (ja nao e conteudo direto)
- Adicionar sub-seccoes ao `subSectionsMap.finance`:
  - `{ id: "finance-expenses", label: "Tipos de Despesas", icon: Receipt, description: "Categorias de despesas" }`
  - `{ id: "finance-fiscal", label: "Fiscal", icon: Calculator, description: "IVA e configuracao fiscal" }`
- Adicionar `"finance-fiscal"` ao tipo `SettingsSubSection`
- Atualizar descricao do grupo finance para "Despesas e configuracao fiscal"

**`Settings.tsx`:**
- Adicionar caso `"finance-fiscal"` no `renderSubContent` que renderiza `<FiscalSettingsTab />`
- Remover `"finance"` do `getDirectSub` (ja nao e caso direto)
- Criar handler `handleSaveFiscal` dedicado que guarda apenas `tax_config` na organizacao

### 5. Props do `IntegrationsContent` simplificadas

Remover as seguintes props da interface `IntegrationsContentProps`:
- `taxRate`, `setTaxRate`
- `taxExemptionReason`, `setTaxExemptionReason`

E remover a passagem destas props no `Settings.tsx` para o `integrationsContentProps`.

## Ficheiros alterados

| Ficheiro | Tipo | Alteracao |
|---|---|---|
| `src/components/settings/FiscalSettingsTab.tsx` | Novo | Componente de configuracao fiscal |
| `src/components/settings/MobileSettingsNav.tsx` | Editar | Adicionar sub-seccoes ao finance, remover de directContentGroups |
| `src/pages/Settings.tsx` | Editar | Adicionar renderSubContent para finance-fiscal, handler handleSaveFiscal, remover tax props das integracoes |
| `src/components/settings/IntegrationsContent.tsx` | Editar | Remover campos de IVA do InvoiceXpress e KeyInvoice |
| `src/components/settings/CreateProductModal.tsx` | Editar | Remover selecao de taxa IVA por produto |
| `src/components/settings/EditProductModal.tsx` | Editar | Remover selecao de taxa IVA por produto |

## Sem alteracoes

- Logica de emissao de faturas (edge functions) -- continua a ler `tax_config` da organizacao
- Logica de override por produto nas edge functions -- como `tax_value` sera null, usara sempre o global
- Tabelas da base de dados -- nenhuma migracao necessaria
