

## Corrigir: "invalid input syntax for type integer" na sincronização

### Problema
O campo `duracao_contrato` na tabela `proposal_cpes` é do tipo **integer**, mas o ficheiro contém o valor decimal `2.04657534246575533`. O update falha porque o Postgres não aceita decimais num campo integer.

### Solução

**Ficheiro: `src/hooks/useCommissionAnalysis.ts`** (linha 513)

Arredondar `duracao_contrato` antes de enviar ao update:
```ts
duracao_contrato: Math.round(item.duracaoContrato),
```

Isto garante que valores como `2.046...` são convertidos para `2` antes de serem enviados à base de dados.

### Ficheiro alterado
- `src/hooks/useCommissionAnalysis.ts` — 1 linha (arredondar `duracao_contrato`)

