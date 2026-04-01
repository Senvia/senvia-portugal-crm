

# Diagnóstico: Lead "José da Silva Esteves" não entrou no sistema

## Causa raiz

O problema **não está no Senvia OS**. A função `submit-lead` não tem nenhuma verificação de subscrição/pagamento — ela aceita leads apenas com base no `webhook_token`, independentemente do estado do plano.

Os logs confirmam: **zero chamadas** à função `submit-lead` nos últimos dias. Ou seja, o Zapier/Make do cliente simplesmente parou de enviar dados para o webhook.

### Por que parou?

Quando o sistema ficou "inativo" (trial expirado, antes do pagamento), a função `check-subscription` começou a crashar com um erro de sintaxe (`Identifier 'planId' has already been declared` — linha duplicada no código). Isto causa erros 500 no frontend. Mas **isso não afeta o webhook de entrada**, que é uma função separada (`submit-lead`).

A causa provável é que o **cenário no Zapier/Make do cliente foi desativado** — seja manualmente, seja por inatividade (Zapier desativa cenários inativos após um período), ou por falha de créditos no plano Zapier/Make deles.

## Plano de correção

### 1. Corrigir o bug no `check-subscription` (obrigatório)
- **Ficheiro**: `supabase/functions/check-subscription/index.ts`
- **Problema**: Linha 173-174 — `const planId` declarado duas vezes
- **Correção**: Remover a linha duplicada (linha 174)
- Deploy da função

### 2. Orientar o cliente sobre o webhook externo
O cliente precisa verificar no Zapier/Make dele:
- Se o cenário/zap está **ativo**
- Se o URL do webhook está correto:
  ```
  POST https://zppcobirzgpfcrnxznwe.supabase.co/functions/v1/submit-lead?mode=webhook&token=5deb79a0-98fc-4f10-99aa-605f35e4a248
  ```
- Se o plano Zapier/Make deles não expirou

### 3. Teste de validação
- Fazer um `curl` de teste ao webhook para confirmar que o sistema aceita leads corretamente
- Verificar que o lead aparece na base de dados

## Resumo técnico

| Componente | Estado |
|---|---|
| `submit-lead` (webhook) | Funcional, sem chamadas recentes |
| `check-subscription` | Bug: `planId` duplicado causa crash |
| Zapier/Make do cliente | Não está a enviar dados |

