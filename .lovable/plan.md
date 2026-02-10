
## Mover secao "Cliente" para o topo do modal de venda

### O que muda

No modal de detalhes da venda (`SaleDetailsModal.tsx`), a secao do cliente/lead sera movida para logo apos o seletor de estado, tornando-a a primeira informacao visivel.

### Nova ordem das secoes

1. Estado da Venda
2. **Cliente** (movido de posicao 6 para posicao 2)
3. Dados de Energia (se aplicavel)
4. Dados do Servico (se aplicavel)
5. CPEs (se aplicavel)
6. Produtos/Servicos
7. Proposta Associada
8. Recorrencia
9. Pagamentos
10. Valores
11. Notas
12. Acoes

### Secao tecnica

**Ficheiro:** `src/components/sales/SaleDetailsModal.tsx`

- Cortar o bloco de codigo das linhas 353-392 (secao Cliente/Lead com icone User, nome, email, telefone e botao WhatsApp)
- Colar imediatamente apos a linha 167 (o primeiro `<Separator />` que vem depois do seletor de estado)
- Sem alteracoes de logica, apenas reordenacao visual
