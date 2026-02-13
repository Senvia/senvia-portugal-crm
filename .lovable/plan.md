

# Sincronizacao Automatica: Clientes e Leads nas Listas de Marketing

## Objectivo

- Todo cliente criado/existente em `crm_clients` entra automaticamente na lista **"Clientes"**
- Todo lead com status diferente de "won" (nao convertido) entra automaticamente na lista **"Leads Nao Convertidas"**
- Quando um lead e convertido a cliente, sai da lista "Leads Nao Convertidas" e entra na lista "Clientes"

## Como funciona

Triggers no banco de dados que reagem a insercoes/actualizacoes e fazem o sync automatico.

```text
crm_clients (INSERT) ──> cria marketing_contact ──> adiciona a lista "Clientes"

leads (INSERT/UPDATE)
  ├── status != 'won' ──> cria marketing_contact ──> adiciona a lista "Leads Nao Convertidas"
  └── status = 'won'  ──> remove da lista "Leads Nao Convertidas"
```

## Alteracoes

### 1. Migracao SQL

**Funcao `sync_client_to_marketing()`:**
- Dispara em INSERT na tabela `crm_clients`
- Cria (ou encontra) um `marketing_contact` com os dados do cliente
- Procura a lista "Clientes" da organizacao (cria se nao existir)
- Adiciona o contacto a lista (ignorando duplicados)

**Funcao `sync_lead_to_marketing()`:**
- Dispara em INSERT e UPDATE na tabela `leads`
- Se o lead NAO esta convertido (status != 'won'): cria/encontra marketing_contact e adiciona a lista "Leads Nao Convertidas"
- Se o lead FOI convertido (status = 'won'): remove da lista "Leads Nao Convertidas"

**Triggers:**
- `trg_client_to_marketing` -- AFTER INSERT em `crm_clients`
- `trg_lead_to_marketing` -- AFTER INSERT OR UPDATE em `leads`

**Seed inicial:**
- Insere os 4 clientes actuais como marketing_contacts e adiciona a lista "Clientes"
- Insere os leads nao convertidos (status != 'won') como marketing_contacts e adiciona a lista "Leads Nao Convertidas"

### 2. Sem alteracoes no frontend

Tudo acontece no backend via triggers. As listas ja aparecem correctamente na UI existente porque o hook `useContactLists` ja conta os membros de `marketing_list_members`.

## Detalhes tecnicos

- Os triggers usam `INSERT ... ON CONFLICT DO UPDATE` no `marketing_contacts` para nao duplicar contactos (pelo email + org)
- Os triggers usam `INSERT ... ON CONFLICT DO NOTHING` no `marketing_list_members` para evitar duplicados
- As listas "Clientes" e "Leads Nao Convertidas" sao criadas automaticamente pelo trigger se ainda nao existirem (usando os IDs das listas ja existentes no banco)
- Os triggers sao `SECURITY DEFINER` para poder inserir em `marketing_contacts` e `marketing_list_members` sem restricoes de RLS
- Leads com email placeholder (`nao-fornecido@placeholder.local`) sao incluidos mas usam o telefone como identificador alternativo

## Ficheiros a editar

| Ficheiro | Accao |
|----------|-------|
| Migracao SQL | Criar funcoes + triggers + seed dos dados actuais |

Nenhum ficheiro frontend precisa de ser alterado.

