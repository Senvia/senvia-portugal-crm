
# Mostrar CPEs do Cliente no Detalhe da Venda

## Problema
Atualmente, a secao de CPEs no detalhe da venda so aparece quando a venda vem de uma proposta com CPEs (`proposalCpes`). Se a venda foi criada manualmente ou a proposta nao tinha CPEs, nada e mostrado -- mesmo que o cliente tenha CPEs na sua ficha.

## Solucao
Adicionar uma consulta aos CPEs do cliente (`useCpes`) como fallback. Se existirem `proposalCpes`, mostra-os (comportamento atual). Caso contrario, mostra os CPEs da ficha do cliente.

## Alteracoes

### `src/components/sales/SaleDetailsModal.tsx`
- Importar `useCpes` de `@/hooks/useCpes`
- Obter o `client_id` da venda (`sale?.client_id`)
- Chamar `useCpes(clientId)` para obter os CPEs do cliente
- Criar uma variavel `displayCpes` que usa `proposalCpes` se existirem, senao usa os CPEs do cliente (mapeados para o mesmo formato visual)
- Atualizar a condicao de renderizacao: `isTelecom && displayCpes.length > 0`
- Adaptar o render para funcionar com ambos os formatos (proposal_cpes tem campos como `existing_cpe_id`, enquanto cpes do cliente tem `status`)

### Logica de fallback

```
Se proposalCpes.length > 0:
  -> Mostrar proposalCpes (comportamento atual, sem alteracoes)
Senao se clientCpes.length > 0:
  -> Mostrar clientCpes com layout adaptado (serial, comercializador, tipo, datas fidelizacao, status)
```

### Ficheiro alterado
- `src/components/sales/SaleDetailsModal.tsx`
