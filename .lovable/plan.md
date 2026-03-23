

## Auditoria completa do módulo Prospects — Bugs e Melhorias

### Bug 1 (Crítico): Quantidade a distribuir é ignorada
O hook `useDistributeProspects` envia `p_quantity` ao RPC `distribute_prospects_round_robin`, mas a sobrecarga SQL que aceita `p_prospect_ids uuid[]` **não tem parâmetro `p_quantity`** — ela processa **todos** os IDs passados. O resultado: se o utilizador seleciona 50 prospects e quer distribuir apenas 10, são distribuídos os 50.

**Correção:** No `useDistributeProspects`, cortar o array client-side antes de enviar:
```
const idsToSend = prospectIds.slice(0, quantity);
```
E remover o parâmetro `p_quantity` do RPC call (não existe nessa sobrecarga).

**Ficheiro:** `src/hooks/useProspects.ts`

---

### Bug 2 (Médio): Emails do Apify não são extraídos correctamente
No `check-prospect-job`, a extracção de email verifica `item.website.includes("@")`. O Apify devolve emails num campo separado (`emails` array) quando `scrapeContacts` está activo. Emails reais são perdidos.

**Correção:** Na edge function, extrair `item.emails?.[0]` como email principal. Guardar emails adicionais no metadata.

**Ficheiro:** `supabase/functions/check-prospect-job/index.ts`

---

### Bug 3 (Menor): `isPlaceholderEmail` retorna `true` para `null`/`undefined`
A função `isPlaceholderEmail(null)` retorna `true`, o que faz com que leads legítimos sem email (campo vazio ou null) sejam tratados como "placeholder". Isto pode esconder o campo de email em leads criados manualmente sem email.

**Correção:** Distinguir "sem email" de "email placeholder":
- `null`/`""` → mostrar como vazio (não é placeholder)
- `@placeholder.local` → é placeholder, mostrar "Sem email (prospect)"

**Ficheiro:** `src/lib/leadUtils.ts`

---

### Bug 4 (Menor): Prospects sem paginação — limite de 1000 rows
O `useProspects` faz `select("*")` sem limite. Supabase retorna no máximo 1000 rows por query. Organizações com mais de 1000 prospects verão dados truncados sem aviso.

**Correção:** Adicionar `.limit(5000)` ou implementar paginação. No mínimo, usar `range(0, 4999)` para alargar o limite.

**Ficheiro:** `src/hooks/useProspects.ts`

---

### Bug 5 (Menor): Dialog de distribuição não trata erros
O `handleDistribute` faz `await mutateAsync()` sem `try/catch`. Se a mutação falhar, o erro propaga sem fechar o dialog — o utilizador fica preso com o loader.

**Correção:** Adicionar `try/catch` no `handleDistribute`.

**Ficheiro:** `src/components/prospects/DistributeProspectsDialog.tsx`

---

### Melhoria 1: Website e rating do prospect não visíveis na tabela
O Apify devolve `website` e `totalScore` (rating), guardados no metadata. Na tabela de prospects, estes campos não são mostrados — o utilizador não tem acesso rápido ao website da empresa.

**Correção:** Adicionar coluna "Website" com link clicável na tabela (para não-P2G).

**Ficheiro:** `src/pages/Prospects.tsx`

---

### Melhoria 2: Telefones adicionais do scrapeContacts perdidos
O Apify pode devolver `item.phones` (array) com múltiplos telefones via `scrapeContacts`. Apenas `item.phone` (singular) é guardado. Telefones adicionais são perdidos.

**Correção:** Guardar `item.phones` no metadata no `check-prospect-job`.

**Ficheiro:** `supabase/functions/check-prospect-job/index.ts`

---

### Resumo dos ficheiros a alterar
| Ficheiro | Tipo | Acção |
|----------|------|-------|
| `src/hooks/useProspects.ts` | Bug 1,4 | Cortar array por quantidade; alargar limite de query |
| `supabase/functions/check-prospect-job/index.ts` | Bug 2, Melhoria 2 | Extrair emails/phones correctamente do Apify |
| `src/lib/leadUtils.ts` | Bug 3 | Distinguir null de placeholder |
| `src/components/prospects/DistributeProspectsDialog.tsx` | Bug 5 | Adicionar try/catch |
| `src/pages/Prospects.tsx` | Melhoria 1 | Adicionar coluna website |

