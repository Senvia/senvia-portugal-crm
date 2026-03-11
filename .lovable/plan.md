

## Adicionar fórmula automática kWp = Valor / 1000 para Condensadores

### Problema
O produto "Condensadores" não tem a função `kwpAuto` definida, pelo que o campo kWp tem de ser preenchido manualmente. A fórmula pretendida é `kWp = valor / 1000`.

### Alteração

**`src/types/proposals.ts`** — Adicionar `kwpAuto` à configuração de Condensadores:

```typescript
// Antes
{ name: 'Condensadores', fields: ['duracao', 'valor', 'kwp', 'comissao'] },

// Depois
{ name: 'Condensadores', fields: ['duracao', 'valor', 'kwp', 'comissao'], kwpAuto: (d) => d.valor != null ? d.valor / 1000 : null },
```

O campo kWp passará a ser calculado automaticamente quando o utilizador preencher o campo "Valor (€)". A lógica existente no `CreateProposalModal` e no `EditProposalModal` já suporta `kwpAuto` — não são necessárias outras alterações.

