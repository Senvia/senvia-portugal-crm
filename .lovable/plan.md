

## Adicionar Acoes aos Pagamentos no Financeiro

### Contexto

A pagina Financeiro > Pagamentos (`src/pages/finance/Payments.tsx`) e atualmente apenas uma tabela de leitura. Quando o utilizador filtra por "Pendentes", ve os pagamentos agendados mas nao consegue fazer nada -- tem de voltar a venda para marcar como pago ou emitir documentos. Isto quebra o fluxo de trabalho.

### O que muda

Adicionar uma coluna "Acoes" na tabela de pagamentos com:

1. **Botao "Marcar como Pago"** -- visivel apenas em pagamentos com estado `pending`
   - Ao clicar, abre um dialogo de confirmacao simples (para evitar cliques acidentais)
   - Atualiza o estado do pagamento para `paid` e a data para hoje
   - O trigger existente na base de dados (`trg_sync_sale_payment_status`) sincroniza automaticamente o estado da venda

2. **Botao "Ver Rascunho"** (futuro, opcional) -- para emitir documentos fiscais diretamente do financeiro. Pode ser adicionado num segundo passo.

### Detalhes tecnicos

**Ficheiro:** `src/pages/finance/Payments.tsx`

- Adicionar uma nova coluna "Acoes" ao `TableHeader` e `TableBody`
- Para pagamentos `pending`, mostrar um botao com icone `CheckCircle` e texto "Marcar Pago"
- Ao clicar, abrir um `AlertDialog` de confirmacao com os dados do pagamento (cliente, valor, data)
- Utilizar o hook `useUpdateSalePayment` de `src/hooks/useSalePayments.ts` para atualizar o estado
- Apos sucesso, a query `all-payments` e `sales` sao invalidadas automaticamente pelo hook

**Fluxo do utilizador:**
1. Vai a Financeiro > Pagamentos (filtro "Pendentes" ja aplicado)
2. Ve a lista de pagamentos agendados
3. Clica em "Marcar Pago" no pagamento desejado
4. Confirma no dialogo
5. O pagamento passa a "Pago" e o estado da venda atualiza-se automaticamente

### Notas
- Pagamentos ja pagos nao mostram nenhum botao de acao (sao imutaveis, conforme as regras existentes)
- Em mobile, a coluna de acoes fica sempre visivel para facilitar o uso
- Nao e necessaria nenhuma alteracao na base de dados -- o hook e o trigger ja existem
