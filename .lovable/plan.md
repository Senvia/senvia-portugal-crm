

# Corrigir Links Falsos do Otto

## Problema
O Otto envia links de navegacao que nao existem na aplicacao. O mapa de rotas no system prompt tem caminhos incorretos que nao correspondem as rotas reais do React Router.

**Rotas erradas no Otto vs rotas reais:**

| Otto envia | Rota real |
|---|---|
| /finance | /financeiro |
| /finance/payments | /financeiro/pagamentos |
| /finance/invoices | /financeiro/faturas |
| /finance/expenses | /financeiro/despesas |

As restantes rotas (/dashboard, /leads, /clients, /calendar, /proposals, /sales, /marketing/*, /ecommerce, /settings) estao corretas.

## Solucao

### 1. Corrigir o MAPA DE ROTAS no system prompt

No ficheiro `supabase/functions/otto-chat/index.ts`, atualizar as 4 rotas de financeiro:

```
- /financeiro --> Financeiro
- /financeiro/pagamentos --> Pagamentos
- /financeiro/faturas --> Faturas
- /financeiro/despesas --> Despesas
```

Remover as rotas antigas `/finance`, `/finance/payments`, `/finance/invoices`, `/finance/expenses`.

### 2. Corrigir os exemplos no system prompt

Os exemplos de interacao tambem usam `[link:Ver Faturas|/finance/invoices]` -- corrigir para `[link:Ver Faturas|/financeiro/faturas]`.

### 3. Corrigir o OttoQuickActions.tsx

O mapeamento `PAGE_ACTIONS` usa `/finance` como chave. Alterar para `/financeiro` para que as acoes rapidas aparecam corretamente quando o utilizador esta na pagina de financas.

### Ficheiros a alterar
1. `supabase/functions/otto-chat/index.ts` -- mapa de rotas + exemplos no system prompt
2. `src/components/otto/OttoQuickActions.tsx` -- chave `/finance` para `/financeiro`

### Resultado
Todos os links enviados pelo Otto apontarao para paginas reais da aplicacao.
