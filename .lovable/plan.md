

## Remover fórmula automática de kWp dos Condensadores

### Alteração

**Ficheiro: `src/types/proposals.ts`**

Remover a propriedade `kwpAuto` da config de "Condensadores", deixando o campo kWp manual:

```typescript
// De:
{ 
  name: 'Condensadores', 
  fields: ['duracao', 'valor', 'kwp', 'comissao'],
  kwpAuto: (d) => d.valor ? (d.valor * 0.67) / 1000 : null,
},

// Para:
{ name: 'Condensadores', fields: ['duracao', 'valor', 'kwp', 'comissao'] },
```

Mesma lógica aplicada anteriormente aos Carregadores. O campo kWp continua visível mas passa a ser preenchido manualmente.

