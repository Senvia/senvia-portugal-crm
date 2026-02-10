

## Adicionar secao de Pagamentos inline no modal "Nova Venda"

### Problema

O modal "Nova Venda" nao tem forma de adicionar pagamentos. O utilizador quer registar pagamentos no momento da criacao, sem ter de ir ao modal de detalhes depois.

### Solucao

Criar uma secao de pagamentos inline no `CreateSaleModal` que guarda os pagamentos em memoria (draft) e os cria na base de dados juntamente com a venda no submit.

### Alteracoes

**Ficheiro: `src/components/sales/CreateSaleModal.tsx`**

1. **Novo state para pagamentos draft:**
   - `draftPayments` -- array de objectos com: `id` (temp UUID), `amount`, `payment_date`, `payment_method`, `status`, `invoice_reference`, `notes`

2. **Nova secao visual "Pagamentos" (entre Valores e Notas):**
   - Separador + header com icone CreditCard e titulo "Pagamentos"
   - Lista dos pagamentos draft adicionados (valor, data, metodo, estado) com botao de remover
   - Barra de resumo: total pago, em falta, percentagem (usando a mesma logica do `calculatePaymentSummary`)
   - Botao "Adicionar Pagamento" que abre o `AddPaymentModal` -- mas em vez de gravar na DB, devolve os dados para o state local

3. **Novo componente inline `AddDraftPaymentModal`:**
   - Reutiliza a mesma UI do `AddPaymentModal` (valor, data, metodo, estado, referencia, notas)
   - Em vez de chamar `useCreateSalePayment`, chama um callback `onAdd(draftPayment)` que adiciona ao array `draftPayments`
   - Nao inclui upload de ficheiro (requer sale_id que ainda nao existe)

4. **Alteracao no `handleSubmit`:**
   - Apos criar a venda e os items, iterar sobre `draftPayments` e chamar `createSalePayment.mutateAsync` para cada um, passando o `sale.id` e `organization_id`

5. **Imports adicionais:**
   - `CreditCard` do lucide-react
   - `Badge`, `Progress` dos componentes UI
   - `PAYMENT_METHOD_LABELS`, `PAYMENT_RECORD_STATUS_LABELS`, `PAYMENT_RECORD_STATUS_COLORS` dos types

### Fluxo do utilizador

```text
Criar Venda
  |
  +-- Secao: Info Basica (cliente, proposta, data)
  +-- Secao: Produtos / Servicos
  +-- Secao: CPEs (se aplicavel)
  +-- Secao: Valores (subtotal, desconto, total)
  +-- Secao: Pagamentos       <-- NOVA
  |     +-- [Adicionar Pagamento] -> mini-modal
  |     +-- Lista de pagamentos draft
  |     +-- Resumo (pago / em falta)
  +-- Secao: Notas
  +-- [Criar Venda] -> grava venda + items + pagamentos
```

### Detalhes tecnicos

- Os pagamentos draft sao guardados em `useState` como array
- O `AddDraftPaymentModal` e um componente simples dentro do mesmo ficheiro (ou separado) que replica os campos do `AddPaymentModal` mas sem interacao com a DB
- No submit, apos `createSale` e `createSaleItems`, fazemos um loop de `createSalePayment.mutateAsync` para cada draft
- O upload de fatura fica disponivel apenas apos a venda ser criada (no modal de detalhes/edicao)
- O botao "Adicionar" desaparece quando o total ja esta coberto pelos drafts
- Reset dos `draftPayments` no `useEffect` de abertura do modal

| Ficheiro | Alteracao |
|---|---|
| `src/components/sales/CreateSaleModal.tsx` | Adicionar state `draftPayments`, secao visual de pagamentos, mini-modal inline, e logica no submit |

