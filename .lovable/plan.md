
# Separar Contactos de Marketing dos Clientes CRM

## O Problema

A importacao de contactos para listas de marketing cria registos na tabela `crm_clients` com `source: 'import'`. Isto mistura contactos de marketing (para campanhas de email) com clientes reais do CRM, inflando os numeros de clientes (247 em vez de 8 reais).

## A Solucao

Criar uma tabela `marketing_contacts` totalmente separada de `crm_clients`. As listas de marketing passam a referenciar `marketing_contacts` em vez de `crm_clients`.

---

## Alteracoes

### 1. Migracao SQL

**Criar tabela `marketing_contacts`:**
- `id` (uuid, PK)
- `organization_id` (uuid, FK para organizations)
- `name` (text, NOT NULL)
- `email` (text)
- `phone` (text)
- `company` (text)
- `source` (text) -- 'import', 'manual', 'form'
- `tags` (jsonb, default '[]')
- `subscribed` (boolean, default true)
- `created_at`, `updated_at`
- Indice unico composto: `(organization_id, email)` para evitar duplicados por org
- RLS: membros da org podem ler/escrever

**Criar tabela `marketing_list_members`:**
- `id` (uuid, PK)
- `list_id` (uuid, FK para client_lists)
- `contact_id` (uuid, FK para marketing_contacts)
- `added_at` (timestamptz)
- Indice unico: `(list_id, contact_id)`
- RLS: igual a client_lists

**Migrar dados existentes:**
- Copiar os 239 contactos importados de `crm_clients` para `marketing_contacts`
- Copiar os registos de `client_list_members` que referenciam esses clientes para `marketing_list_members` (remapeando client_id para contact_id)
- Apagar os 239 registos de `crm_clients` com `source = 'import'`
- Apagar os registos antigos de `client_list_members` que ja foram migrados

### 2. `src/hooks/useContactLists.ts` -- Actualizar

- `useContactListMembers`: mudar query de `client_list_members` + `crm_clients` para `marketing_list_members` + `marketing_contacts`
- `useAddListMembers`: inserir em `marketing_list_members` com `contact_id` em vez de `client_id`
- `useRemoveListMember`: apagar de `marketing_list_members`
- Actualizar tipos `ContactListMember` para ter `contact_id` e `contact` em vez de `client_id` e `client`

### 3. `src/components/marketing/ImportContactsModal.tsx` -- Refazer importacao

- Em vez de inserir em `crm_clients`, inserir em `marketing_contacts`
- Em vez de associar via `client_list_members`, associar via `marketing_list_members`
- Remover a dependencia de `useClients()` (que carrega todos os clientes CRM desnecessariamente)
- A verificacao de duplicados passa a ser por email dentro de `marketing_contacts`

### 4. `src/components/marketing/ListDetailsModal.tsx` -- Actualizar

- Mudar a referencia de membros para usar `marketing_contacts` em vez de `crm_clients`
- Actualizar display de contactos

### 5. `src/components/marketing/SendTemplateModal.tsx` -- Actualizar

- Se usa contactos de listas para enviar emails, mudar para buscar de `marketing_contacts`

### 6. `src/types/marketing.ts` -- Adicionar tipo

```
export interface MarketingContact {
  id: string;
  organization_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  tags: string[];
  subscribed: boolean;
  created_at: string;
  updated_at: string;
}
```

---

## Ficheiros a editar

| Ficheiro | Accao |
|----------|-------|
| Migracao SQL | Criar `marketing_contacts` e `marketing_list_members`, migrar dados, limpar `crm_clients` importados |
| `src/types/marketing.ts` | Adicionar `MarketingContact` |
| `src/hooks/useContactLists.ts` | Mudar queries para `marketing_contacts` + `marketing_list_members` |
| `src/components/marketing/ImportContactsModal.tsx` | Importar para `marketing_contacts` em vez de `crm_clients` |
| `src/components/marketing/ListDetailsModal.tsx` | Actualizar referencias |
| `src/components/marketing/SendTemplateModal.tsx` | Buscar contactos de `marketing_contacts` |
| `src/components/marketing/CreateCampaignModal.tsx` | Actualizar seccao de destinatarios para buscar de `marketing_contacts` |

## Resultado

- `crm_clients` volta a ter apenas os 8 clientes reais
- Contactos de marketing vivem em `marketing_contacts` -- tabela separada
- A importacao passa a criar contactos de marketing, nao clientes CRM
- Listas de marketing referenciam contactos de marketing
- Zero impacto nos clientes reais do CRM
