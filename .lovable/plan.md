

# Redesign UX dos Modais de Vendas - Layout Inteligente com Reorganizacao de Campos

## Problema atual

Os modais de vendas foram apenas expandidos para full-screen, mas os campos continuam empilhados verticalmente numa unica coluna, como se fosse um formulario longo. Nao houve reorganizacao da informacao para aproveitar o espaco disponivel. O utilizador tem de fazer muito scroll para ver tudo.

## Principios do redesign

1. **Informacao mais importante primeiro e visivel sem scroll**
2. **Usar layout de 2 colunas em desktop** para aproveitar o espaco horizontal
3. **Agrupar informacao relacionada em cards visuais** em vez de secoes lineares
4. **Reduzir scroll** colocando mais informacao acima da dobra
5. **Mobile continua a ser 1 coluna** (responsivo)

---

## 1. SaleDetailsModal (Visualizar Venda)

### Layout novo - Desktop (2 colunas)

```text
+----------------------------------------------------------+
| Header: [Codigo] [Badge Status] [Data]             [X]   |
+----------------------------------------------------------+
|                                                           |
|  COLUNA ESQUERDA (60%)    |  COLUNA DIREITA (40%)        |
|                           |                               |
|  [Card Cliente]           |  [Card Valor Total]           |
|   Nome, Codigo, NIF       |   Valor grande, IVA           |
|   Empresa, Email           |                               |
|   Telefone + WhatsApp     |  [Card Estado]                |
|   Morada                  |   Select de status             |
|                           |                               |
|  [Card Produtos/Servicos] |  [Card Proposta Associada]    |
|   Tabela com items         |   Codigo, data                |
|   Qtd x Preco = Total     |                               |
|                           |  [Card Recorrencia]           |
|  [Card Dados Telecom]     |   Status, proxima renovacao    |
|   (se aplicavel)          |                               |
|                           |  [Card Observacoes]           |
|  [Card Pagamentos]        |   Textarea editavel            |
|   Lista de pagamentos     |                               |
|   Acoes de faturacao      |                               |
|                           |                               |
+----------------------------------------------------------+
| Footer: [Editar Venda]              [Eliminar Venda]      |
+----------------------------------------------------------+
```

### Mobile (1 coluna)
- Ordem: Valor Total -> Cliente -> Estado -> Produtos -> Telecom -> Pagamentos -> Proposta -> Recorrencia -> Observacoes

### Mudancas concretas:
- **Valor Total sobe para o topo** na coluna direita (ou topo em mobile) - e a informacao mais importante
- **Cliente e Estado ficam lado a lado** em desktop (esquerda/direita)
- **Produtos ficam numa mini-tabela** mais compacta em vez de cards individuais
- **Pagamentos ficam na coluna esquerda** (area maior, precisa de mais espaco)
- **Observacoes e Proposta ficam na coluna direita** (informacao secundaria)

---

## 2. CreateSaleModal (Nova Venda)

### Layout novo - Desktop (2 colunas)

```text
+----------------------------------------------------------+
| Header: [Icone] Nova Venda                          [X]   |
+----------------------------------------------------------+
|                                                           |
|  COLUNA ESQUERDA (60%)    |  COLUNA DIREITA (40%)        |
|                           |                               |
|  [Cliente]  [Proposta]    |  [Card Resumo - sticky]       |
|   Combobox   Combobox      |   Subtotal                    |
|                           |   - Desconto [input]           |
|  [Data Venda] [Estado]    |   -------------------------    |
|   DatePicker   Select     |   IVA (se IX ativo)           |
|                           |   TOTAL (grande, primary)      |
|  [Card Fiscal Cliente]    |   Total c/ IVA                |
|   (se IX ativo)           |                               |
|                           |  [Card Notas]                 |
|  [Dados Telecom]          |   Textarea                    |
|   (se aplicavel)          |                               |
|                           |  [Botao Criar Venda]          |
|  [Produtos/Servicos]      |                               |
|   Select + Lista items    |                               |
|                           |                               |
|  [Pagamentos]             |                               |
|   (se nao telecom)        |                               |
|                           |                               |
+----------------------------------------------------------+
```

### Mudancas concretas:
- **Resumo de valores fica sticky na coluna direita** - o utilizador ve sempre o total enquanto adiciona produtos
- **Cliente + Proposta ficam na mesma linha** (2 comboboxes lado a lado)
- **Data + Estado ficam na mesma linha**
- **Produtos ocupam a coluna esquerda** (precisam de mais espaco para os controlos de quantidade/preco)
- **Botao "Criar Venda" move para a coluna direita**, debaixo do resumo (proximidade com o total)
- **Footer fixo e eliminado** - a acao principal fica no contexto do resumo
- **Botao Cancelar fica no header** (ja ha o X)

---

## 3. EditSaleModal (Editar Venda)

### Layout novo - Mesmo padrao do CreateSaleModal

```text
+----------------------------------------------------------+
| Header: Editar Venda [Codigo]                       [X]   |
+----------------------------------------------------------+
|                                                           |
|  COLUNA ESQUERDA (60%)    |  COLUNA DIREITA (40%)        |
|                           |                               |
|  [Cliente]  [Data]        |  [Card Resumo - sticky]       |
|   Combobox   DatePicker    |   Subtotal                    |
|                           |   - Desconto [input]           |
|  [Proposta associada]     |   -------------------------    |
|   (readonly badge)        |   TOTAL (grande, primary)      |
|                           |                               |
|  [Card Fiscal Cliente]    |  [Card Notas]                 |
|   (se IX ativo)           |   Textarea                    |
|                           |                               |
|  [Produtos/Servicos]      |  [Botao Guardar]              |
|   Nome editavel           |  [Botao Cancelar]             |
|   Qtd +/- Preco           |                               |
|   + Adicionar produto     |                               |
|                           |                               |
|  [Pagamentos]             |                               |
|   SalePaymentsList        |                               |
|                           |                               |
+----------------------------------------------------------+
```

### Mudancas concretas:
- **Mesmo layout de 2 colunas** que o CreateSaleModal para consistencia
- **Resumo sticky na direita** com total sempre visivel
- **Pagamentos na coluna esquerda** (componente SalePaymentsList precisa de espaco)
- **Acoes (Guardar/Cancelar) na coluna direita** junto ao resumo

---

## Detalhes tecnicos de implementacao

### Estrutura CSS (comum aos 3 modais)

```text
<DialogContent variant="fullScreen">
  <Header sticky />
  <div class="flex-1 overflow-y-auto">
    <div class="max-w-6xl mx-auto p-6">        <!-- Largura aumentada para 6xl -->
      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div class="lg:col-span-3 space-y-6">  <!-- Coluna esquerda 60% -->
          ...
        </div>
        <div class="lg:col-span-2 space-y-6">  <!-- Coluna direita 40% -->
          <div class="lg:sticky lg:top-0">      <!-- Sticky apenas em desktop -->
            ...
          </div>
        </div>
      </div>
    </div>
  </div>
</DialogContent>
```

### Ficheiros a alterar

1. **`src/components/sales/SaleDetailsModal.tsx`** - Reorganizar campos em 2 colunas, mover Valor Total para o topo da coluna direita, tornar Produtos mais compactos
2. **`src/components/sales/CreateSaleModal.tsx`** - Layout 2 colunas, resumo sticky na direita, agrupar campos basicos no topo esquerdo
3. **`src/components/sales/EditSaleModal.tsx`** - Mesmo padrao do Create, resumo sticky, acoes na direita

### Responsividade

- **Desktop (lg+)**: 2 colunas (3/5 + 2/5)
- **Tablet/Mobile (<lg)**: 1 coluna, ordem otimizada (valor total primeiro em mobile no Details)
- O `max-w` sobe de `4xl` para `6xl` para acomodar as 2 colunas

### O que NAO muda

- Toda a logica de negocio, handlers, hooks e state management
- Os componentes filhos (SalePaymentsList, RecurringSection, PaymentTypeSelector, etc.)
- Os dados fiscais e calculos de IVA
- Os modais aninhados (AlertDialog de delete, etc.)
- A variante `fullScreen` do DialogContent

