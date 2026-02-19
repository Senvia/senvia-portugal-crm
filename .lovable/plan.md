

# Adicionar Estado "Entregue" nas Vendas

## Resumo
Adicionar um novo estado "Entregue" ao ciclo de vida das vendas, ficando com 4 estados no total: **Em Progresso**, **Entregue**, **Concluida** e **Cancelado**.

## Logica de Negogio

O fluxo passa a ser:
1. **Em Progresso** - Venda criada, a decorrer
2. **Entregue** - Servico/produto entregue ao cliente
3. **Concluida** - Venda finalizada (ex: apos faturacao)
4. **Cancelado** - Venda cancelada

A automacao de faturacao continua a marcar vendas como "Concluida" (delivered). O novo estado "Entregue" (fulfilled) e um passo intermedio.

## O que muda

### 1. Tipos e Constantes (`src/types/sales.ts`)
- Adicionar `'fulfilled'` ao tipo `SaleStatus`
- Adicionar label: `fulfilled: 'Entregue'`
- Adicionar cor: `fulfilled: 'bg-purple-500/20 text-purple-500 border-purple-500/30'`
- Adicionar ao array `SALE_STATUSES`

### 2. Pagina de Vendas (`src/pages/Sales.tsx`)
- Atualizar as stats do resumo para incluir contagem de vendas "Entregue"
- Adicionar card de resumo ou ajustar os existentes

### 3. Modal de Detalhes (`src/components/sales/SaleDetailsModal.tsx`)
- O dropdown de estado ja usa `SALE_STATUSES` dinamicamente, portanto vai aparecer automaticamente
- A logica de "lock delivered sales" mantem-se apenas para o estado `delivered` (Concluida)

### 4. Modal de Criacao (`src/components/sales/CreateSaleModal.tsx`)
- O novo estado fica disponivel no selector de estado

### 5. Dashboard Stats (`src/hooks/useDashboardStats.ts`)
- Ajustar para considerar `fulfilled` nas metricas relevantes

### 6. Widget Data (`src/hooks/useWidgetData.ts`)
- Atualizar filtros de vendas entregues se necessario

### 7. Edge Functions de Faturacao
- **Sem alteracao** - continuam a marcar como `delivered` (Concluida) apos emissao de fatura

### 8. Base de Dados
- O campo `status` na tabela `sales` e do tipo `text`, nao precisa de migracao

## Ficheiros alterados
- `src/types/sales.ts`
- `src/pages/Sales.tsx`
- `src/components/sales/SaleDetailsModal.tsx` (verificar logica de lock)
- `src/hooks/useDashboardStats.ts`
- `src/hooks/useWidgetData.ts`
- `src/hooks/useTelecomSaleMetrics.ts`

