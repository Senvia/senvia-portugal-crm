

## Plano: Estado padrão "Entregue" ao criar venda a partir de proposta (telecom)

### Problema
Quando uma proposta passa para venda automaticamente no Perfect2Gether, o estado padrão da venda é "Em Progresso" (`in_progress`). Deveria ser "Entregue" (`fulfilled`).

### Alteração

**Ficheiro: `src/components/sales/CreateSaleModal.tsx`**

No `useEffect` que inicializa o formulário quando o modal abre (linhas ~228-319), após o bloco que preenche os campos da proposta (`if (prefillProposal)`), adicionar:

```typescript
// Para telecom, quando vem de proposta, estado padrão = fulfilled (Entregue)
if (isTelecom && prefillProposal) {
  setSaleStatus('fulfilled');
}
```

Isto aplica-se apenas quando:
- A organização é telecom (Perfect2Gether)
- A venda é criada a partir de uma proposta (prefillProposal existe)

Para outras orgs e vendas manuais, mantém `in_progress`.

### Resultado
- 1 ficheiro, ~3 linhas adicionadas
- Apenas Perfect2Gether afetado
- O utilizador pode ainda alterar o estado manualmente no formulário

