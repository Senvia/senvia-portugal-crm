

## Remover fórmula automática de kWp dos Carregadores

### Alteração

**Ficheiro: `src/types/proposals.ts`** (linha ~148)

Remover a propriedade `kwpAuto` da config de "Carregadores", deixando o campo kWp manual:

```typescript
// De:
{ 
  name: 'Carregadores', 
  fields: ['valor', 'kwp', 'comissao'],
  kwpAuto: (d) => d.valor ? (d.valor * 0.67) / 1000 : null,
},

// Para:
{ 
  name: 'Carregadores', 
  fields: ['valor', 'kwp', 'comissao'],
},
```

Apenas esta linha é removida. O campo kWp continua visível mas passa a ser preenchido manualmente pelo utilizador.

