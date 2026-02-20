

## Refazer a Secao de Campos nas Definicoes

### Contexto Atual

Atualmente, existe apenas o `ClientFieldsEditor` que configura campos para **Clientes** (nome, email, telefone, empresa, NIF, morada, notas). As configuracoes ficam guardadas na coluna `client_fields_settings` da tabela `organizations`.

### O Que Vai Mudar

Criar **4 separadores** na secao "Campos" das definicoes:
- **Campos Leads** - campos do formulario de criacao manual de leads
- **Campos Clientes** - campos do formulario de criacao/edicao de clientes (o que ja existe)
- **Campos Propostas** - campos do formulario de criacao de propostas
- **Campos Vendas** - campos do formulario de criacao de vendas

Cada campo pode ser **ativado/desativado** (visivel) e marcado como **obrigatorio ou nao**.

### Alteracoes Tecnicas

**1. Migracao de Base de Dados**

Adicionar 3 novas colunas JSONB na tabela `organizations`:

```sql
ALTER TABLE public.organizations
  ADD COLUMN lead_fields_settings jsonb DEFAULT '{}',
  ADD COLUMN proposal_fields_settings jsonb DEFAULT '{}',
  ADD COLUMN sale_fields_settings jsonb DEFAULT '{}';
```

**2. Criar tipos para cada entidade** (`src/types/field-settings.ts`)

Definir interfaces genéricas e defaults para cada entidade:

- **Lead fields**: company_nif, company_name, name, email, phone, source, temperature, value, notes, tipologia, consumo_anual
- **Client fields**: (manter os existentes) name, email, phone, company, company_nif, nif, address, notes
- **Proposal fields**: client, proposal_type, negotiation_type, notes, products, cpes, comissao
- **Sale fields**: client, proposal, sale_date, items, discount, notes, status

Cada campo tera a interface:
```text
{ visible: boolean, required: boolean, label: string }
```

**3. Criar componente generico `EntityFieldsEditor`**

Um componente reutilizavel que recebe:
- Lista de campos disponiveis com icones
- Settings atuais
- Callback de save

Este componente substitui o `ClientFieldsEditor` atual, mantendo o mesmo UX (toggle visivel, toggle obrigatorio, label editavel).

**4. Criar novo componente `FieldsSettingsPage`**

Pagina com `Tabs` (4 separadores):
- Leads | Clientes | Propostas | Vendas

Cada tab renderiza o `EntityFieldsEditor` com os campos da respetiva entidade.

**5. Criar hooks para cada entidade**

- `useLeadFieldsSettings()` / `useUpdateLeadFieldsSettings()` - le/grava `lead_fields_settings`
- Manter `useClientFieldsSettings()` (ja existe)
- `useProposalFieldsSettings()` / `useUpdateProposalFieldsSettings()` - le/grava `proposal_fields_settings`
- `useSaleFieldsSettings()` / `useUpdateSaleFieldsSettings()` - le/grava `sale_fields_settings`

**6. Atualizar `Settings.tsx` e `MobileSettingsNav`**

- A sub-secao "org-fields" passa a renderizar `FieldsSettingsPage` em vez de `ClientFieldsEditor`
- Atualizar descricao para "Campos de leads, clientes, propostas e vendas"

**7. Aplicar configuracoes nos formularios**

Nos modais de criacao, usar os settings para:
- Esconder campos desativados
- Marcar campos como obrigatorios
- Usar o label configurado

Os formularios afetados sao:
- `AddLeadModal.tsx` - usa `lead_fields_settings`
- `CreateClientModal.tsx` - ja usa `client_fields_settings`
- `CreateProposalModal.tsx` - usa `proposal_fields_settings`
- `CreateSaleModal.tsx` - usa `sale_fields_settings`

### Campos por Entidade

**Leads:**
| Campo | Label Default | Visivel | Obrigatorio |
|-------|-------------|---------|-------------|
| company_nif | NIF da Empresa | true | true |
| company_name | Nome da Empresa | true | true |
| name | Nome do Contacto | true | true |
| email | Email | true | true |
| phone | Telemovel | true | true |
| source | Origem | true | false |
| temperature | Temperatura | true | false |
| value | Valor | true | false |
| notes | Notas | true | false |
| tipologia | Tipologia | true | false |
| consumo_anual | Consumo Anual | true | false |

**Clientes:** (sem alteracao, manter os existentes)

**Propostas:**
| Campo | Label Default | Visivel | Obrigatorio |
|-------|-------------|---------|-------------|
| client | Cliente | true | true |
| proposal_type | Tipo de Proposta | true | true |
| negotiation_type | Tipo Negociacao | true | false |
| notes | Observacoes | true | false |
| comissao | Comissao | true | false |
| products | Produtos | true | false |

**Vendas:**
| Campo | Label Default | Visivel | Obrigatorio |
|-------|-------------|---------|-------------|
| client | Cliente | true | true |
| proposal | Proposta | true | false |
| sale_date | Data da Venda | true | true |
| items | Itens | true | true |
| discount | Desconto | true | false |
| notes | Notas | true | false |
| status | Estado | true | false |

### Ficheiros a Criar
- `src/types/field-settings.ts`
- `src/components/settings/EntityFieldsEditor.tsx`
- `src/components/settings/FieldsSettingsPage.tsx`
- `src/hooks/useLeadFieldsSettings.ts`
- `src/hooks/useProposalFieldsSettings.ts`
- `src/hooks/useSaleFieldsSettings.ts`

### Ficheiros a Alterar
- `src/components/settings/MobileSettingsNav.tsx` - descricao da sub-secao
- `src/pages/Settings.tsx` - trocar `ClientFieldsEditor` por `FieldsSettingsPage`
- `src/components/leads/AddLeadModal.tsx` - respeitar `lead_fields_settings`
- `src/components/proposals/CreateProposalModal.tsx` - respeitar `proposal_fields_settings`
- `src/components/sales/CreateSaleModal.tsx` - respeitar `sale_fields_settings`

### Resultado

- Administradores podem configurar quais campos aparecem e sao obrigatorios em cada tipo de registo (leads, clientes, propostas, vendas)
- Interface com 4 tabs limpa e intuitiva
- Os formularios de criacao respeitam as configuracoes definidas
- Retrocompativel com as definicoes de clientes ja existentes

