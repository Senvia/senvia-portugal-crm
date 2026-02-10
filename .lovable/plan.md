

## Novo fluxo de "Adicionar Pagamento" com escolha Total vs Parcelado

### Problema atual

Ao clicar em "Adicionar Pagamento", abre diretamente o formulario de pagamento. O utilizador quer primeiro escolher o tipo de pagamento.

### Novo fluxo

```text
[Adicionar Pagamento]
       |
       v
  Modal de Escolha
  +------------------+------------------+
  |  Pagamento Total |  Parcelado       |
  |  (valor total)   |  (dividir em     |
  |                  |   parcelas)      |
  +------------------+------------------+
       |                     |
       v                     v
  AddPaymentModal      ScheduleRemainingModal
  (pre-filled total,   (divide o total em
   status = paid)       1-4 parcelas pendentes)
```

### Alteracoes

**1. Novo componente: `src/components/sales/PaymentTypeSelector.tsx`**

Modal simples com dois cartoes clicaveis:
- **Pagamento Total**: Icone de check, mostra o valor em falta. Ao clicar, abre o `AddPaymentModal` com o valor total pre-preenchido e status "paid".
- **Pagamento Parcelado**: Icone de calendario, descricao "Dividir em parcelas". Ao clicar, abre o `ScheduleRemainingModal` diretamente (que ja tem a logica de dividir em 1-4 parcelas com datas).

Design dark mode, estilo cards lado a lado (mobile: empilhados verticalmente).

**2. Alterar `src/components/sales/SalePaymentsList.tsx`**

- Adicionar estado `showTypeSelector` (boolean)
- O botao "Adicionar" e "Adicionar Pagamento" passam a abrir o `PaymentTypeSelector` em vez do `AddPaymentModal` diretamente
- O `PaymentTypeSelector` recebe callbacks `onSelectTotal` e `onSelectInstallments`:
  - `onSelectTotal`: fecha o seletor e abre `AddPaymentModal` (comportamento atual)
  - `onSelectInstallments`: fecha o seletor e abre `ScheduleRemainingModal` diretamente
- Remover a logica atual que abre automaticamente o `ScheduleRemainingModal` apos um pagamento parcial (ja nao e necessario, pois o utilizador escolhe explicitamente)

### Detalhes tecnicos

| Ficheiro | Acao |
|---|---|
| `src/components/sales/PaymentTypeSelector.tsx` | Criar -- modal com dois cartoes (Total / Parcelado) |
| `src/components/sales/SalePaymentsList.tsx` | Alterar -- botoes "Adicionar" abrem o seletor; remover auto-schedule apos pagamento parcial |

Nenhuma alteracao na base de dados. Apenas UX.

