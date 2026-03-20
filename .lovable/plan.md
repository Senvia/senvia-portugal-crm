

## Auditoria Completa — Conta P2G

Após análise detalhada do código, identifiquei os seguintes problemas e inconsistências:

---

### BUG 1: `useLiveCommissions` filtra apenas `status = 'delivered'` — ignora `'fulfilled'`

**Ficheiro:** `src/hooks/useLiveCommissions.ts` (linha 100)

O hook que calcula comissões ao vivo filtra vendas com `.eq('status', 'delivered')`, mas noutras partes do sistema (ex: `useSalesCommissions.ts`, `useTelecomSaleMetrics.ts`), vendas com status `'fulfilled'` (Entregue) também são contabilizadas. Isto pode causar **vendas entregues que não aparecem nas comissões da P2G**.

**Correção:** Mudar para `.in('status', ['delivered', 'fulfilled'])`.

---

### BUG 2: `useSalesCommissions` usa `created_by` em vez de `assigned_to` do cliente

**Ficheiro:** `src/hooks/useSalesCommissions.ts` (linha 72)

O widget de comissões do Dashboard agrupa vendas por `sale.created_by` (quem criou a venda), mas na P2G a lógica de comissões no módulo financeiro usa `client.assigned_to` (comercial atribuído ao cliente). Isto causa **discrepâncias entre o widget do Dashboard e o módulo de Comissões**.

**Severidade:** Médio — afeta apenas o widget do Dashboard, não o módulo financeiro.

---

### BUG 3: Chargebacks — query limitada a 5000 items e 200 imports

**Ficheiro:** `src/hooks/useCommissionAnalysis.ts` (linhas 259, 265)

A query de items de chargebacks tem `.range(0, 4999)` (máximo 5000 linhas) e imports `.range(0, 199)`. Se a P2G tiver ficheiros grandes, os dados serão truncados silenciosamente, resultando em **totais incorretos nos cards de CB/Comissões**.

**Correção:** Para os items, filtrar pelo `import_id` do import ativo em vez de trazer todos. Isto reduz drasticamente o volume e elimina o risco de truncamento.

---

### BUG 4: Apenas o último import é usado para análise

**Ficheiro:** `src/hooks/useCommissionAnalysis.ts` (linha 289)

`const activeImportId = imports[0]?.id ?? null` — apenas o import mais recente é considerado. Se o utilizador importar um ficheiro de Janeiro e depois um de Fevereiro, ao voltar a Janeiro os dados não aparecem porque o import ativo é o de Fevereiro.

**Correção:** Selecionar o import cujo `reference_month` corresponde ao mês selecionado, não simplesmente o mais recente.

---

### BUG 5: `kWp` duplicado por CPE em vez de por proposta

**Ficheiro:** `src/hooks/useLiveCommissions.ts` (linha 192)

`const cpeServicosKwp = proposalKwpMap.get(cpe.proposal_id) || 0` — se uma proposta tem 2 CPEs, o kWp total da proposta é contado 2x (uma vez por CPE). Isto infla o total de kWp exibido nas Ativações.

**Correção:** Dividir o kWp pelo número de CPEs da proposta, ou contabilizar apenas uma vez por proposta.

---

### BUG 6: Conversão Lead → Cliente não copia `company_nif` do prospect

**Ficheiro:** `src/hooks/useConvertProspectToLead.ts` (linha 62)

Ao converter prospect → lead, o campo `company_nif` recebe `v_prospect.nif` (na RPC), mas ao converter lead → cliente (`useClients.ts` linha 206), o `company_nif` é passado como parâmetro direto de `leadData.company_nif`. Se o modal de conversão não preencher este campo, o NIF da empresa perde-se na cadeia.

**Severidade:** Baixo — depende de como o modal preenche os dados.

---

### INCONSISTÊNCIA 7: `CommissionsWidget` vs `CommissionsTab` — fontes de dados diferentes

O `CommissionsWidget` (Dashboard) usa `useSalesCommissions` que filtra por `sale_date` e status `fulfilled/delivered`. O `CommissionsTab` (Finanças) usa `useLiveCommissions` que filtra por `activation_date` e status `delivered` apenas. Resultados diferentes para o mesmo mês.

---

### PROBLEMA 8: `profiles` query filtra por `organization_id` mas perfis podem ser multi-org

**Ficheiro:** `src/hooks/useSalesCommissions.ts` (linha 62)

`.select("id, full_name").eq("organization_id", orgId)` — perfis de utilizadores que pertencem a múltiplas organizações podem não ter `organization_id` da P2G no campo profiles, pois `profiles.organization_id` pode apontar para a primeira org. Deveria usar `organization_members` para resolver nomes.

---

### Resumo de Prioridades

| # | Problema | Impacto | Complexidade |
|---|----------|---------|-------------|
| 4 | Import ativo ignora mês selecionado | Alto | Baixo |
| 1 | Comissões ignoram status `fulfilled` | Alto | Trivial |
| 5 | kWp duplicado por CPE | Médio | Baixo |
| 3 | Truncamento silencioso de chargebacks | Médio | Baixo |
| 7 | Widgets mostram dados inconsistentes | Médio | Médio |
| 2 | Dashboard usa `created_by` vs `assigned_to` | Médio | Baixo |
| 8 | Profiles multi-org incorretos | Baixo | Baixo |
| 6 | `company_nif` perdido na conversão | Baixo | Trivial |

### Plano de Correção

Corrigir os 8 problemas nos seguintes ficheiros:

1. **`src/hooks/useLiveCommissions.ts`** — `.in('status', ['delivered', 'fulfilled'])` + fix kWp duplicado
2. **`src/hooks/useCommissionAnalysis.ts`** — selecionar import por `reference_month` do mês selecionado + filtrar items por `import_id` na query em vez de client-side
3. **`src/hooks/useSalesCommissions.ts`** — usar `organization_members` para nomes (opcional, menor prioridade)

Posso avançar com todas as correções ou prefere priorizar algum subset?

