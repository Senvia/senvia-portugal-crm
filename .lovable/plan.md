

# Bloquear Edição de Vendas Concluídas e Canceladas (Apenas Admin)

## Problema Atual
A lógica de bloqueio (`isLocked`) apenas considera vendas com estado "Concluída" (delivered) e opcionalmente "Entregue" (fulfilled). Vendas com estado **"Cancelado"** não estão bloqueadas, permitindo que qualquer utilizador as altere.

## Solução
Adicionar o estado `cancelled` à lógica de bloqueio, garantindo que vendas Concluídas e Canceladas só podem ser editadas por administradores.

---

## Secção Técnica

### Ficheiro: `src/components/sales/SaleDetailsModal.tsx`

**Alteração nas linhas 106-108** - Adicionar verificação de `cancelled`:

```typescript
const isDeliveredAndLocked = sale?.status === 'delivered' && !isAdmin;
const isFulfilledAndLocked = lockFulfilledSales && sale?.status === 'fulfilled' && !isAdmin;
const isCancelledAndLocked = sale?.status === 'cancelled' && !isAdmin;
const isLocked = isDeliveredAndLocked || isFulfilledAndLocked || isCancelledAndLocked;
```

**Alteração na mensagem de bloqueio (linhas 299-303)** - Incluir texto para canceladas:

```typescript
{isLocked && (
  <p className="text-xs text-muted-foreground mt-3">
    Esta venda está {isDeliveredAndLocked ? 'concluída' : isCancelledAndLocked ? 'cancelada' : 'entregue'} e não pode ser alterada.
  </p>
)}
```

Estas alterações garantem que:
- O dropdown de estado fica desativado para vendas canceladas (não-admin)
- O botão "Editar" fica oculto para vendas canceladas (não-admin)
- As notas ficam bloqueadas para vendas canceladas (não-admin)
- Apenas administradores podem reverter ou alterar vendas canceladas
