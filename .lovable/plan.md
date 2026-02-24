

# Ocultar Secção de Pagamentos na Edição de Vendas Telecom

## Problema
No modal de edição de vendas (`EditSaleModal.tsx`), a secção "Payments" (linha 880) é exibida para todas as organizações, incluindo telecom. Falta a verificação `!isTelecom`.

## Solução
Adicionar a condição `!isTelecom` à renderização da secção de pagamentos, tal como já existe noutras partes do código.

---

## Secção Técnica

### Ficheiro: `src/components/sales/EditSaleModal.tsx`

**Linha 880** - Alterar a condição:

De:
```typescript
{organization && (
```

Para:
```typescript
{organization && !isTelecom && (
```

Isto é consistente com a abordagem já usada no `SaleDetailsModal.tsx` (linhas 630 e 676) onde `!isTelecom` já é aplicado para ocultar pagamentos.

