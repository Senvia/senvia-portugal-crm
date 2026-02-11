

## Adicionar Seletor de Metodo de Pagamento ao Dialogo "Marcar como Pago"

### Problema

Quando o utilizador clica em "Marcar Pago", o dialogo de confirmacao nao permite escolher o metodo de pagamento. Se o pagamento foi agendado sem metodo definido (`payment_method = null`), fica marcado como pago sem essa informacao -- o que prejudica os relatorios e a emissao de documentos fiscais.

### Solucao

Adicionar um **seletor de metodo de pagamento** ao dialogo de confirmacao, visivel **apenas quando o pagamento nao tem metodo definido**. Se ja tiver metodo, mostra apenas o valor atual (sem edicao).

### Detalhes tecnicos

**Ficheiro:** `src/pages/finance/Payments.tsx`

1. Adicionar um estado `selectedMethod` (tipo `PaymentMethod | null`) que e inicializado com o `payment_method` do pagamento ao abrir o dialogo.

2. No `AlertDialogDescription`, apos os dados existentes (Cliente, Venda, Valor, Data), adicionar:
   - Se `confirmPayment.payment_method` for `null`: um `Select` com todas as opcoes de `PAYMENT_METHODS` e labels de `PAYMENT_METHOD_LABELS`
   - Se ja tiver metodo: mostrar apenas o texto do metodo atual

3. Atualizar `handleMarkAsPaid` para incluir `payment_method: selectedMethod` no objeto `updates`, enviando o metodo escolhido junto com o estado e a data.

4. Resetar `selectedMethod` quando o dialogo fecha.

5. **Nota importante**: O `AlertDialogAction` por defeito fecha o dialogo ao clicar. Para evitar conflitos com o `Select` (dropdown dentro de dialogo), sera necessario substituir o `AlertDialog` por um `Dialog` normal, ou usar `e.preventDefault()` no `AlertDialogAction` e gerir o fecho manualmente. A abordagem mais limpa e converter para `Dialog` simples com botoes normais.

### Resultado esperado

- Pagamento **sem metodo**: aparece dropdown para escolher (MB Way, Transferencia, Dinheiro, Cartao, Cheque, Outro)
- Pagamento **com metodo**: mostra o metodo atual como texto
- Ao confirmar, o metodo e gravado junto com o estado "pago"
