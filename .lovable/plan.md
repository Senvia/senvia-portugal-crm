

## Correção: Adicionar Padding ao Módulo Financeiro

### Problema Identificado

As páginas do módulo Financeiro não têm padding horizontal, fazendo com que o conteúdo fique colado às bordas do ecrã. As outras páginas (Dashboard, Sales, etc.) usam `p-4 md:p-6 lg:p-8` para o espaçamento.

### Páginas Afetadas

| Página | Ficheiro |
|--------|----------|
| Dashboard Financeiro | `src/pages/Finance.tsx` |
| Pagamentos | `src/pages/finance/Payments.tsx` |
| Faturas | `src/pages/finance/Invoices.tsx` |

### Alteração

Adicionar `p-4 md:p-6 lg:p-8` ao container principal de cada página:

**Antes:**
```html
<div className="space-y-6 pb-20 md:pb-6">
```

**Depois:**
```html
<div className="p-4 md:p-6 lg:p-8 space-y-6 pb-20 md:pb-6">
```

### Ficheiros a Modificar

| Ficheiro | Linha | Alteração |
|----------|-------|-----------|
| `src/pages/Finance.tsx` | 26 | Adicionar padding |
| `src/pages/finance/Payments.tsx` | 65 | Adicionar padding |
| `src/pages/finance/Invoices.tsx` | 54 | Adicionar padding |

**Total: 3 ficheiros, 1 linha cada**

