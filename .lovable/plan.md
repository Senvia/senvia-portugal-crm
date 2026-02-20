
# Atualizar Preco do Plano Elite

## Alteracao
Atualizar o preco mensal do plano **Elite** de 199 EUR para **147 EUR** na tabela `subscription_plans`.

| Plano | Preco Atual | Preco Final |
|-------|------------|-------------|
| Starter | 49 EUR | 49 EUR (sem alteracao) |
| Pro | 99 EUR | 99 EUR (sem alteracao) |
| Elite | 199 EUR | **147 EUR** |

## Detalhe Tecnico
Uma unica operacao de UPDATE na base de dados:

```text
UPDATE subscription_plans SET price_monthly = 147 WHERE id = 'elite'
```

Nenhum ficheiro de codigo precisa de ser alterado - o hook `useSubscription` ja le o preco dinamicamente da base de dados.
