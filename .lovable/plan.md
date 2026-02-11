

## Corrigir Navegacao do Card "Recebido"

### Problema
O card "Recebido" navega para `/financeiro/pagamentos` sem filtro, mostrando todos os pagamentos (incluindo agendados/pendentes). Deveria mostrar apenas os pagamentos com status "paid".

### Solucao

**Ficheiro: `src/pages/Finance.tsx`** (1 linha)

Alterar o `onClick` do card "Recebido" de:
```
navigate('/financeiro/pagamentos')
```
para:
```
navigate('/financeiro/pagamentos?status=paid')
```

**Ficheiro: `src/pages/finance/Payments.tsx`** (1 linha)

O `useEffect` que le o status da URL so reconhece `pending`. Alterar para aceitar tambem `paid`:
```
const statusFromUrl = searchParams.get('status');
if (statusFromUrl === 'pending' || statusFromUrl === 'paid') {
  setStatusFilter(statusFromUrl);
}
```

### Resultado
- Clicar em "Recebido" abre a lista filtrada apenas por pagamentos pagos
- Clicar em "Pendente" continua a funcionar como antes (status=pending)

