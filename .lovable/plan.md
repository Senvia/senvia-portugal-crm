

## Permitir super admin editar vendas concluídas

### Problema
A linha 278 do `EditSaleModal.tsx` define:
```ts
const canFullEdit = sale?.status !== 'delivered' && sale?.status !== 'cancelled' && sale?.status !== 'fulfilled';
```
Isto bloqueia a edição de cliente, produtos e resumo para **todos os utilizadores**, incluindo super admins. Campos ficam desativados e secções inteiras ficam escondidas.

A variável `isDeliveredLocked` (linha 114) já considera `isAdmin`, mas `canFullEdit` não.

### Solução

**Ficheiro: `src/components/sales/EditSaleModal.tsx`**

1. Importar `isSuperAdmin` do `usePermissions()`
2. Alterar `canFullEdit` (linha 278) para permitir super admins e admins:
   ```ts
   const canFullEdit = isAdmin || (sale?.status !== 'delivered' && sale?.status !== 'cancelled' && sale?.status !== 'fulfilled');
   ```
   Isto garante que admins/super admins podem editar todos os campos mesmo em vendas concluídas/entregues/canceladas.

### Ficheiros alterados
- `src/components/sales/EditSaleModal.tsx` — 1 linha alterada (linha 278)

