

# Corrigir botoes de Upgrade/Downgrade na pagina de Plano e Faturacao

## Problema Atual

- Todos os planos que nao sao o atual mostram o botao "Fazer Upgrade", mesmo que sejam inferiores ao plano atual.
- Nao existe botao de "Downgrade".
- Nao ha distincao visual entre subir ou descer de plano.

## Alteracoes

### Ficheiro: `src/components/settings/BillingTab.tsx`

Adicionar logica para determinar a posicao relativa de cada plano face ao atual e ajustar o texto e estilo do botao:

- **Plano atual** -> Botao "Plano Atual" (desativado, como esta)
- **Plano superior** -> Botao "Fazer Upgrade" (estilo primario)
- **Plano inferior** -> Botao "Fazer Downgrade" (estilo outline/secondary, com confirmacao)

A logica usa o indice do plano no array `STRIPE_PLANS` para comparar:

```
const currentIndex = STRIPE_PLANS.findIndex(p => p.id === currentPlanId);
const planIndex = STRIPE_PLANS.findIndex(p => p.id === plan.id);

if (planIndex > currentIndex) -> "Fazer Upgrade"
if (planIndex < currentIndex) -> "Fazer Downgrade"
```

Para o downgrade, o botao redireciona para o portal do Stripe (via `openCustomerPortal`) em vez de criar um novo checkout, pois o Stripe gere downgrades atraves do portal de cliente.

### Resumo das mudancas

| Cenario | Texto do Botao | Acao | Estilo |
|---------|---------------|------|--------|
| Plano atual | "Plano Atual" | Nenhuma (desativado) | Outline |
| Plano superior | "Fazer Upgrade" | `createCheckout(priceId)` | Primary/Default |
| Plano inferior | "Fazer Downgrade" | `openCustomerPortal()` | Secondary/Outline |
| Organizacao isenta | Sem botoes | -- | -- |

Apenas o ficheiro `BillingTab.tsx` sera alterado. Nao ha alteracoes na base de dados nem em edge functions.
