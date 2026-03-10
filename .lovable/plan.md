

## Plano: Adicionar tag Energia/Serviços nos cards de vendas

### Alteração

**Ficheiro: `src/pages/Sales.tsx`** (linhas 263-275)

Adicionar um `Badge` com a tag do tipo de proposta (`Energia` / `Serviços`) ao lado do badge de status, visível apenas para orgs telecom com módulo energy ativo.

```tsx
// Após o badge de status (linha 269), adicionar:
{isTelecom && modules.energy && sale.proposal_type && (
  <Badge 
    variant="outline" 
    className={sale.proposal_type === 'energia' 
      ? 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-xs' 
      : 'bg-cyan-500/20 text-cyan-600 border-cyan-500/30 text-xs'}
  >
    {sale.proposal_type === 'energia' ? '⚡ Energia' : '🔧 Serviços'}
  </Badge>
)}
```

### Resultado
- Cada card de venda mostra a tag colorida (amarelo para Energia, cyan para Serviços)
- Apenas visível em orgs telecom com energy ativo (Perfect2Gether)
- 1 ficheiro, ~8 linhas adicionadas

