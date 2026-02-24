

# Telecom: Nome da Empresa como identificador principal da Lead

## Objetivo

Para organizacoes com nicho "telecom", o campo "Nome da Empresa" (company_name) deve ser **obrigatorio** e deve ser esse nome a aparecer como nome principal da Lead em todo o sistema (Kanban, tabela, detalhes).

## Alteracoes

### 1. AddLeadModal.tsx -- Logica de submissao (linha 185)

Atualmente: `name: data.name || data.company_name || ''`

Para telecom, inverter a prioridade: `name: isTelecom ? (data.company_name || data.name || '') : (data.name || data.company_name || '')`

Isto garante que o campo `name` na base de dados (usado como nome principal em todo o sistema) recebe o nome da empresa no nicho telecom.

### 2. AddLeadModal.tsx -- Schema dinamico (funcao buildLeadSchema)

Quando o nicho e telecom, forcar `company_name` como obrigatorio independentemente das definicoes de campo. Adicionar o parametro `niche` a funcao `buildLeadSchema` e, se `niche === 'telecom'`, garantir que `company_name` tem `required: true`.

### 3. LeadCard.tsx -- Display (linhas 198-201)

Para telecom, mostrar `company_name` como titulo principal e `name` (contacto pessoal) como texto secundario:

```text
Telecom:
  H4: lead.company_name || lead.name
  Small: lead.name (se diferente de company_name)

Outros nichos:
  H4: lead.name
  Small: lead.company_name (como esta)
```

### 4. LeadsTableView.tsx -- Display (linhas 280-283)

Mesma logica do LeadCard: para telecom, mostrar `company_name` como nome principal e `name` como secundario.

### 5. Edge Function submit-lead -- Logica de nome (linha ~164)

Na edge function `submit-lead`, quando o lead e criado para uma org telecom, o campo `name` deve usar `company_name` como prioridade. Verificar o nicho da organizacao (ja temos acesso ao `org`) e ajustar:

```text
name: org.niche === 'telecom'
  ? (body.company_name?.trim() || body.name?.trim() || 'Anonimo')
  : (body.name?.trim() || body.company_name?.trim() || 'Anonimo')
```

Isto requer adicionar `niche` ao SELECT da organizacao na edge function.

## Ficheiros Alterados

1. `src/components/leads/AddLeadModal.tsx` -- Schema forcado + prioridade de nome para telecom
2. `src/components/leads/LeadCard.tsx` -- Display condicional por nicho
3. `src/components/leads/LeadsTableView.tsx` -- Display condicional por nicho
4. `supabase/functions/submit-lead/index.ts` -- Prioridade de nome + SELECT do niche

## Resultado

- Telecom: company_name obrigatorio, aparece como nome principal em todo o Kanban/tabela/detalhes
- Outros nichos: comportamento inalterado (nome pessoal e o principal)

