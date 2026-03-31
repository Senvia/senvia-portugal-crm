

## Corrigir checkout Stripe bloqueado no PWA

### Problema
No modo PWA (app instalada), `window.open(url, '_blank')` é bloqueado silenciosamente. Quando o Daniel clica para selecionar um plano, nada acontece porque o sistema tenta abrir o Stripe Checkout numa nova aba — que o PWA não permite.

### Solução
Alterar o `useStripeSubscription.ts` para detetar se a app está em modo standalone (PWA) e, nesse caso, usar `window.location.href` em vez de `window.open`. Isto redireciona na mesma janela, que funciona perfeitamente no PWA.

### Alterações

**1) `src/hooks/useStripeSubscription.ts`**
- Na função `createCheckout`: substituir `window.open(data.url, '_blank')` por lógica que deteta PWA e usa `window.location.href`
- Na função `openCustomerPortal`: mesma alteração
- Deteção de PWA: `window.matchMedia('(display-mode: standalone)').matches`

**2) Nenhuma outra alteração necessária** — o hook é usado em todo o sistema de billing, portanto a correção propaga-se automaticamente.

### Resultado
O Daniel (e qualquer utilizador no PWA) ao clicar num plano será redirecionado para a página de pagamento Stripe na mesma janela, sem bloqueios. Após o pagamento, o Stripe redireciona de volta para a app normalmente.

