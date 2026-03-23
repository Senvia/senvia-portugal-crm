

## Problema: Plano de 49€ "não disponível"

### Causa raiz
A página de Definições **não lê o parâmetro `?tab=billing`** da URL. Quando o utilizador da Escolha Inteligente clicou "Escolher Plano" no blocker de trial expirado, foi redirecionado para `/settings?tab=billing`, mas a página mostrou a vista inicial das definições — o utilizador não encontrou onde selecionar o plano.

O preço de 49€ (Starter) está **activo e correcto** no Stripe (`price_1T2uHzLWnA81DzXTHdexakfL`). O problema é apenas de navegação na UI.

### Correção

**Ficheiro: `src/pages/Settings.tsx`**

Adicionar leitura do `searchParams` para que, quando a URL contém `?tab=billing`, a página abra directamente na secção "Plano e Faturação":

1. Importar `useSearchParams` do react-router-dom
2. No `useEffect` inicial, verificar se `searchParams.get('tab') === 'billing'` e, se sim, definir `activeGroup = 'billing'` e `activeSub = 'billing'`
3. Limpar o parâmetro da URL após aplicar (para não interferir com navegação posterior)

### Ficheiros alterados
| Ficheiro | Acção |
|----------|-------|
| `src/pages/Settings.tsx` | Ler `?tab=billing` e auto-navegar para a secção de faturação |

