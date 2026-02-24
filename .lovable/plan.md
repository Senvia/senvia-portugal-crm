# Data de Ativação e Bloqueio de Edição por Estado

## Resumo

Adicionar um campo "Data de Ativação" às vendas que aparece quando o estado muda para **Entregue, Progresso** ou **Concluída**. Quando a venda passa a **Concluída**, apenas administradores podem continuar a editar.

## O que muda para ti

1. Quando mudas o estado de uma venda para **Entregue**, aparece um campo para definir a **Data de Ativação**
2. Quando mudas para **Concluída**, podes corrigir a Data de Ativação nesse momento
3. Depois de **Concluída**, a venda fica **bloqueada** para edição -- apenas Administradores podem alterar
4. Na ficha de detalhes da venda, a Data de Ativação aparece junto aos outros dados

## Secção Técnica

### 1. Migração da base de dados

Adicionar coluna `activation_date` (tipo `date`, nullable) à tabela `sales`.

```sql
ALTER TABLE public.sales ADD COLUMN activation_date date;
```

### 2. Tipos TypeScript -- `src/types/sales.ts`

- Adicionar `activation_date?: string | null` ao interface `Sale`

### 3. Hook `useSales.ts`

- Adicionar `activation_date` ao objeto `updates` aceite por `useUpdateSale`

### 4. `SaleDetailsModal.tsx` -- Alteração de estado com Data de Ativação

- Quando o utilizador muda o estado para `fulfilled` (Entregue) ou `delivered` (Concluída), mostrar um campo de Data de Ativação no diálogo de confirmação
- Guardar a `activation_date` junto com o novo estado
- Mostrar a Data de Ativação na ficha de detalhes (read-only)
- **Bloqueio:** quando `status === 'delivered'`, desabilitar o select de estado e o botão de editar para utilizadores não-admin (usando `usePermissions().isAdmin`)

### 5. `EditSaleModal.tsx` -- Campo editável + bloqueio

- Adicionar estado local `activationDate` e input de data no card "Dados da Venda"
- Campo visível quando `status` é `fulfilled` ou `delivered`
- Incluir `activation_date` no `handleSubmit`
- **Bloqueio total:** quando `sale.status === 'delivered'` e o utilizador **não é admin**, mostrar aviso e desabilitar o botão "Guardar Alterações"

### Ficheiros editados:

1. Migração SQL (nova coluna `activation_date`)
2. `src/types/sales.ts`
3. `src/hooks/useSales.ts`
4. `src/components/sales/SaleDetailsModal.tsx`
5. `src/components/sales/EditSaleModal.tsx`