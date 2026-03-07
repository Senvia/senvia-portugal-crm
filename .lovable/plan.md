

## Auditoria de Bugs e Falhas

Após revisão detalhada do código, encontrei os seguintes problemas:

---

### Bug 1: Duplicação de formulário não copia campos importantes

**Ficheiro:** `src/hooks/useForms.ts` (linhas 300-309)

A função `useDuplicateForm` cria uma cópia do formulário mas **não copia** os campos: `target_stage`, `assigned_to`, `meta_pixels`, `msg_template_hot/warm/cold`, `ai_qualification_rules`. O utilizador perde todas as configurações de automação ao duplicar.

**Correção:** Incluir todos os campos do formulário original na inserção da cópia.

---

### Bug 2: Widget de Comissões mostra skeleton errado

**Ficheiro:** `src/components/dashboard/CommissionsWidget.tsx` (linha 16)

A condição `if (isLoading && stripeLoading)` usa `&&` em vez de `||`. Se apenas um dos dois está a carregar, o widget mostra dados incompletos em vez do skeleton de loading.

**Correção:** Mudar para `if (isLoading || stripeLoading)`.

---

### Bug 3: Grid de summary cards pode quebrar no mobile

**Ficheiro:** `src/components/dashboard/CommissionsWidget.tsx` (linha 73)

A grid usa `grid-cols-2 sm:grid-cols-4` com 3 ou 4 cards condicionais. Quando `hasRecurringData` é true, são 4 cards (OK). Quando é false, são 3 cards numa grid de 2 colunas, deixando o último card sozinho e desalinhado.

**Correção:** Usar `grid-cols-2 sm:grid-cols-3` quando `!hasRecurringData`.

---

### Bug 4: `useCommissionsDetail` não filtra por período

**Ficheiro:** `src/hooks/useCommissionsDetail.ts`

O hook busca **todas** as vendas fulfilled/delivered sem filtro de data. O modal de "Comissões a Pagar" mostra comissões acumuladas de todo o histórico, não do período selecionado. Inconsistente com o card que diz "Total do período" e com o `useSalesCommissions` que filtra por mês.

**Correção:** Adicionar filtro de data (mês/período) à query.

---

### Bug 5: Org search no CreateSaleModal pode não funcionar

**Ficheiro:** `src/components/sales/CreateSaleModal.tsx` (linha 188)

O estado `orgSearchResults` é populado mas preciso verificar se a query de pesquisa de organizações respeita permissões. A query provavelmente falha por RLS — um utilizador normal não pode fazer `SELECT` na tabela `organizations` para pesquisar todas as orgs clientes.

**Correção:** Verificar se existe uma RLS policy que permite membros da Senvia org pesquisarem organizações, ou criar uma RPC `security definer` para esta busca.

---

### Bug 6: `useEffect` no Finance.tsx tem dependências incompletas

**Ficheiro:** `src/pages/Finance.tsx` (linhas 39-43)

O `useEffect` depende de `organization?.niche` mas usa `validTabs` e `activeTab` no corpo sem os incluir nas dependências. Pode causar comportamento inconsistente.

---

### Resumo de prioridades

| # | Bug | Severidade | Impacto |
|---|-----|-----------|---------|
| 1 | Duplicar form perde automações | Alta | Funcionalidade quebrada |
| 2 | Loading skeleton com `&&` | Baixa | Flash visual |
| 3 | Grid desalinhada | Baixa | Visual |
| 4 | Comissões sem filtro de período | Média | Dados incorretos |
| 5 | Pesquisa de orgs pode falhar por RLS | Alta | Feature não funciona |
| 6 | useEffect deps incompletas | Baixa | Edge case |

### Ficheiros a alterar
- `src/hooks/useForms.ts` — corrigir `useDuplicateForm`
- `src/components/dashboard/CommissionsWidget.tsx` — corrigir condição loading
- `src/hooks/useCommissionsDetail.ts` — adicionar filtro por período
- `src/components/sales/CreateSaleModal.tsx` — verificar/corrigir pesquisa de orgs
- `src/pages/Finance.tsx` — corrigir deps do useEffect

