

## Restringir Data de Ativação ao nicho Telecom

### Problema
A "Data de Ativação" e os diálogos de confirmação com data de ativação aparecem para **todas** as organizações, mas deviam ser exclusivos do nicho **telecom**.

### Alterações

#### 1. `src/components/sales/CreateSaleModal.tsx`
- **Linha 600**: Adicionar `isTelecom &&` à validação obrigatória da data de ativação
- **Linha 897**: Adicionar `isTelecom &&` à condição de renderização do campo

#### 2. `src/components/sales/SaleDetailsModal.tsx`
- **Linhas 170-188** (`handleStatusChange`): Para nichos não-telecom, mudar estado diretamente sem pedir data de ativação (sem abrir diálogos de confirmação)
- **Linhas 194-211** (`confirmDelivered`/`confirmFulfilled`): Só enviar `activation_date` se `isTelecom`
- **Linha 312**: Mostrar "Data de Ativação" só se `isTelecom`
- **Linha 762**: Mostrar "Histórico de Ativação" só se `isTelecom`
- **Diálogos de confirmação (linhas 940, 967)**: Só mostrar o campo de data nos diálogos se `isTelecom`; para outros nichos, a mudança de estado é direta

#### 3. `src/components/sales/EditSaleModal.tsx`
- Campos de `activationDate` e `edpProposalNumber` já estão no submit geral — envolver com `isTelecom` para não enviar dados desnecessários
- O campo de UI da data de ativação na edição (se existir) deve ser condicionado a `isTelecom`

### Resultado
- Organizações não-telecom: mudança de estado direta, sem campo de data de ativação
- Organizações telecom: comportamento atual mantido (data obrigatória ao concluir)

