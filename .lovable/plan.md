

## Alinhar SaleDetailsModal com o template generico da ProposalDetailsModal

### Sequencia do ProposalDetailsModal (generico / nao-telecom)

```text
1. Header (titulo + badge status + data)
2. Cliente (card simples: nome, email, telefone)
3. Status selector
4. Produtos/Servicos (catalogo com qty x preco)
5. Valor Total (bloco destacado bg-primary/10)
6. Observacoes da Negociacao (textarea)
7. Footer (acoes)
```

### Sequencia atual do SaleDetailsModal

```text
1. Header (code + status + data)
2. Status selector
3. Cliente (detalhado com NIF, empresa, morada, WhatsApp)
4. Dados Energia (telecom)
5. Dados Servico (telecom)
6. CPEs (telecom)
7. Itens da Venda
8. Proposta Associada
9. Recorrencia
10. Pagamentos
11. Notas
12. Footer (fatura + editar + eliminar)
```

### Nova sequencia do SaleDetailsModal

```text
1. Header (code + badge status + data)
2. Cliente (card com nome, email, telefone, NIF, empresa, morada, WhatsApp)
3. Status selector
4. [Telecom only: Resumo Telecom, CPEs, Servicos telecom]
5. Produtos/Servicos (itens da venda com qty x preco)
6. Valor Total (bloco destacado bg-primary/10)
7. Proposta Associada
8. Recorrencia
9. Pagamentos
10. Observacoes da Negociacao (renomear label)
11. Footer (fatura + editar + eliminar)
```

### Alteracoes no ficheiro `SaleDetailsModal.tsx`

1. **Reordenar blocos JSX** dentro do ScrollArea para seguir a nova sequencia:
   - Mover o bloco **Cliente** para antes do Status selector
   - Mover secoes de Energia/Servico/CPEs para depois do Status (apenas telecom)
   - Mover **Itens da Venda** para depois dos dados telecom
   - Adicionar bloco **Valor Total** destacado (igual ao da proposta: `bg-primary/10 border-primary/20` com valor em `text-2xl font-bold text-primary`) depois dos itens
   - Manter Proposta Associada, Recorrencia e Pagamentos na mesma ordem
   - Renomear label "Notas" para "Observacoes da Negociacao"

2. **Adicionar bloco Valor Total** - Novo bloco visual entre os itens e a proposta associada:
   ```text
   [bg-primary/10 border border-primary/20 rounded-lg p-4]
   Valor Total (text-sm text-muted-foreground)
   1.200,00 EUR (text-2xl font-bold text-primary)
   ```

3. **Nenhuma alteracao de logica** - Apenas reordenacao de blocos existentes e adicao do bloco de valor total

| Alteracao | Detalhe |
|---|---|
| Ordem: Cliente antes do Status | Mover bloco cliente/lead para cima |
| Novo bloco: Valor Total | `bg-primary/10` com `formatCurrency(sale.total_value)` |
| Rename: Notas -> Observacoes | Label "Observacoes da Negociacao" |
| Ordem geral | Seguir sequencia do ProposalDetailsModal generico |

