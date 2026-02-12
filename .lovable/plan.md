

# Remover estado "Pendente" das Vendas

## Resumo

O estado `pending` deixa de existir como estado de venda. Toda venda sera criada com o estado `in_progress` por defeito. O utilizador pode selecionar outro estado (Concluida ou Cancelado) mas "Pendente" desaparece das opcoes.

**Nota importante:** O `pending` continua a existir em `PaymentStatus` e `PaymentRecordStatus` (pagamentos pendentes/agendados) -- essas nao mudam.

## Alteracoes

### 1. `src/types/sales.ts`
- Remover `'pending'` do tipo `SaleStatus` (fica: `'in_progress' | 'delivered' | 'cancelled'`)
- Remover entrada `pending` de `SALE_STATUS_LABELS`, `SALE_STATUS_COLORS`
- Remover `'pending'` do array `SALE_STATUSES`

### 2. `src/components/sales/CreateSaleModal.tsx`
- Alterar o estado inicial de `saleStatus` de `"pending"` para `"in_progress"`
- Alterar o reset apos criacao de `"pending"` para `"in_progress"`

### 3. `src/components/sales/SaleDetailsModal.tsx`
- Alterar o estado inicial de `status` de `"pending"` para `"in_progress"` (este valor e substituido pelo `useEffect` com o `sale.status`, serve apenas como fallback)

### 4. `src/pages/Sales.tsx`
- Remover o card de resumo "Pendentes" (o quarto card com icone Clock)
- Remover a contagem `pending` do calculo de `stats`
- Os 3 cards restantes ficam: Total Vendas, Entregues, Em Progresso (com grid `grid-cols-2 md:grid-cols-3`)

### 5. `src/hooks/useWidgetData.ts`
- No case `'sales_active'`: remover `s.status === 'pending'` do filtro (manter apenas `in_progress`)
- No case `'active_projects'`: remover `s.status === 'pending'` do filtro
- No case `'pending_installations'`: alterar para filtrar por `in_progress` em vez de `pending`

### 6. Migracao de base de dados
- Atualizar todas as vendas existentes com `status = 'pending'` para `status = 'in_progress'`
- Alterar o valor default da coluna `status` na tabela `sales` de `'pending'` para `'in_progress'`

## O que NAO muda

- `PaymentStatus` (`pending`, `partial`, `paid`) -- os pagamentos continuam com estado pendente
- `PaymentRecordStatus` (`pending`, `paid`) -- as parcelas agendadas continuam como pending
- Qualquer logica de pagamentos, faturacao, recorrencia
- Eventos de calendario, pedidos internos e CPEs que usam o seu proprio `pending`

