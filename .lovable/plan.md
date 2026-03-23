

## Preencher campos automaticamente na cadeia Prospect → Lead → Cliente

### Problema actual

A cadeia de dados **Prospect → Lead → Cliente** perde informação em duas passagens:

1. **`useConvertProspectToLead`** (conversão via contactos de marketing) — não passa `custom_data` (CPE, segmento), `consumo_anual`, nem NIF
2. **`useConvertLeadToClient`** — não copia `consumo_anual`, `company_nif` e `company_name` da lead para o cliente

A conversão via `distribute_prospects_round_robin` (distribuição em massa) já funciona correctamente na passagem prospect→lead, mas a passagem lead→cliente continua a perder campos.

### Alterações

#### 1) `src/hooks/useConvertProspectToLead.ts` — passar mais campos do prospect para a lead

No insert da lead (linha 64-77), adicionar:
- `consumo_anual` a partir de `(contact as any).annual_consumption_kwh`
- `custom_data` com `cpe`, `segment` e `metadata` do prospect (se existirem)

#### 2) `src/hooks/useClients.ts` — copiar campos da lead para o cliente

No `useConvertLeadToClient` (linha 190-214):
- Expandir o select da lead para incluir `company_name, company_nif, consumo_anual`
- Ao inserir o cliente, preencher automaticamente:
  - `company` ← `lead.company_name` (se não vier no `leadData`)
  - `company_nif` ← `lead.company_nif` (se não vier no `leadData`)
- O `consumo_anual` não tem coluna no `crm_clients`, mas o NIF e empresa sim

### Ficheiros alterados
- `src/hooks/useConvertProspectToLead.ts`
- `src/hooks/useClients.ts`

