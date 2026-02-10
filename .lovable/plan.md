

## Permitir editar propostas aceites (bloquear apenas com venda concluida)

### Problema

Atualmente, quando uma proposta tem o status "Aceite", o botao "Editar" e o seletor de status ficam `disabled`. Isto e demasiado restritivo -- o utilizador quer poder continuar a editar propostas aceites. A edicao so deve ser bloqueada se ja existir uma **venda concluida** (status `delivered`) associada a proposta.

### Solucao

1. Adicionar uma query para verificar se existe uma venda com status `delivered` associada a proposta
2. Substituir a condicao `status === 'accepted'` pela nova verificacao

### Detalhes tecnicos

**Ficheiro: `src/components/proposals/ProposalDetailsModal.tsx`**

1. Adicionar uma query ao Supabase para verificar se existe uma venda concluida:
```tsx
const { data: completedSale } = useQuery({
  queryKey: ['proposal-completed-sale', proposal?.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('sales')
      .select('id, status')
      .eq('proposal_id', proposal!.id)
      .eq('status', 'delivered')
      .maybeSingle();
    return data;
  },
  enabled: !!proposal?.id,
});

const hasCompletedSale = !!completedSale;
```

2. Linha 593 -- alterar `disabled={status === 'accepted'}` para `disabled={hasCompletedSale}` (seletor de status)

3. Linha 813 -- alterar `disabled={status === 'accepted'}` para `disabled={hasCompletedSale}` (botao Editar no dropdown)

### Resultado

- Propostas aceites podem ser editadas normalmente
- Apenas propostas com venda concluida ficam bloqueadas para edicao
- O seletor de status tambem fica disponivel em propostas aceites (exceto se houver venda concluida)

| Ficheiro | Alteracao |
|---|---|
| `src/components/proposals/ProposalDetailsModal.tsx` | Query para venda concluida + substituir condicoes `disabled` |

