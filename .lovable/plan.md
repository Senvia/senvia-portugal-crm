

# Regras de Vendas Configuraveis nas Definicoes

## Resumo

Criar duas regras de negocio configuraveis por organizacao:
1. **Bloquear edicao de vendas Concluidas** -- com dialogo de confirmacao ao concluir
2. **Impedir exclusao de pagamentos** -- ocultar botao de eliminar pagamento

Ambas as regras sao controladas por checkboxes em **Definicoes > Definicoes Gerais > Vendas** (nova sub-seccao).

---

## 1. Nova sub-seccao "Vendas" nas Definicoes Gerais

### Navegacao
Adicionar `"org-sales"` ao sub-menu de "general" em `MobileSettingsNav.tsx`:

```text
Definicoes Gerais
  - Geral
  - Pipeline
  - Modulos
  - Formulario
  - Campos
  - Vendas  <-- NOVO (icone: ShoppingCart)
```

### Componente `SalesSettingsTab.tsx` (novo)
Card com titulo "Regras de Vendas" e duas opcoes com Checkbox:
- "Bloquear edicao de vendas concluidas" (chave: `lock_delivered_sales`)
- "Impedir exclusao de pagamentos" (chave: `prevent_payment_deletion`)

Os valores sao guardados na coluna JSONB `sales_settings` da tabela `organizations`.

---

## 2. Base de dados

Adicionar coluna `sales_settings` (JSONB, default `{}`) a tabela `organizations`.

```sql
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS sales_settings jsonb DEFAULT '{}'::jsonb;
```

Estrutura esperada:
```json
{
  "lock_delivered_sales": true,
  "prevent_payment_deletion": true
}
```

---

## 3. Logica de negocio

### 3a. Confirmacao ao concluir venda (`SaleDetailsModal.tsx`)

Quando `lock_delivered_sales` esta ativo e o utilizador muda o status para `delivered`:
- Interceptar o `handleStatusChange`
- Exibir um `AlertDialog` com a mensagem: "Ao concluir esta venda, ela nao podera mais ser editada. Deseja continuar?"
- Se confirmar: muda o status para `delivered`
- Se cancelar: nao muda nada

Quando a venda ja esta `delivered` e `lock_delivered_sales` esta ativo:
- Ocultar o botao "Editar Venda" no footer
- O select de status fica `disabled`

### 3b. Impedir exclusao de pagamentos (`SalePaymentsList.tsx`)

Quando `prevent_payment_deletion` esta ativo:
- Ocultar o botao `Trash2` (eliminar) em cada pagamento
- Remover toda a logica de `deletingPayment` e o `AlertDialog` de confirmacao de exclusao
- A edicao de pagamentos pendentes continua disponivel

---

## Ficheiros a alterar

### Novos:
1. **`src/components/settings/SalesSettingsTab.tsx`** -- UI com 2 checkboxes para as regras

### Alterados:
2. **`src/components/settings/MobileSettingsNav.tsx`** -- Adicionar `"org-sales"` ao tipo e ao `subSectionsMap.general`
3. **`src/pages/Settings.tsx`** -- Adicionar case `"org-sales"` no `renderSubContent`
4. **`src/components/sales/SaleDetailsModal.tsx`** -- Ler `sales_settings` da org, adicionar AlertDialog de confirmacao ao concluir, ocultar "Editar" se bloqueado
5. **`src/components/sales/SalePaymentsList.tsx`** -- Receber prop `preventPaymentDeletion`, ocultar botao de eliminar condicionalmente
6. **`src/hooks/useOrganization.ts`** -- Garantir que `updateOrganization` suporta `sales_settings`

### Migracao:
7. **SQL** -- Adicionar coluna `sales_settings` a tabela `organizations`

---

## Detalhes tecnicos

### SalesSettingsTab.tsx
```text
Card "Regras de Vendas"
  [x] Bloquear edicao de vendas concluidas
      Descricao: "Vendas com estado 'Concluida' nao podem ser editadas."
  
  [x] Impedir exclusao de pagamentos
      Descricao: "Pagamentos registados nao podem ser eliminados."
  
  [Guardar] -- chama updateOrganization({ sales_settings: {...} })
```

### SaleDetailsModal - Fluxo de confirmacao
- Novo estado: `showDeliveredConfirm` (boolean)
- Novo estado: `pendingDeliveredStatus` (para guardar o status temporariamente)
- No `handleStatusChange`: se `newStatus === 'delivered'` e `lock_delivered_sales` ativo, abrir AlertDialog em vez de mudar direto
- No AlertDialog: ao confirmar, executar `updateSale.mutate`
- Se venda ja esta `delivered` e setting ativo: `onEdit` prop nao e passada/botao fica hidden, select de status fica disabled

### SalePaymentsList - Nova prop
- `preventPaymentDeletion?: boolean` -- se true, nao renderiza o botao Trash2
- O componente pai (`SaleDetailsModal`) le o setting da org e passa a prop
