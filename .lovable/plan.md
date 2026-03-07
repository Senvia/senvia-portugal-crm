

## Card "Comissões a Pagar" no Financeiro + Modal Detalhado

### O que será feito

1. **Card na grelha de stats do Resumo financeiro** -- "Comissões a Pagar" com ícone Percent, valor total, clicável
2. **Modal full-screen** (seguindo o padrão mobile-first do projeto) com:
   - Resumo total de comissões no topo
   - Tabela por comercial com linhas expansíveis ou tabela flat com: Comercial, Venda (código), Valor da Venda, % Comissão, Valor Comissão
   - Total por comercial em linha de subtotal
3. **Hook dedicado** que busca dados com detalhe por venda (o hook existente `useSalesCommissions` só dá agregados)

### Alterações técnicas

**Novo: `src/components/finance/CommissionsPayableModal.tsx`**
- Dialog full-screen (padrão do projeto)
- Busca vendas fulfilled/delivered do período com `created_by`, `total_value`, `sale_date`, `code`
- Agrupa por comercial, mostra cada venda como linha na tabela
- Linha de subtotal por comercial com total de comissão
- Linha final com grande total

**Editar: `src/pages/Finance.tsx`**
- Adicionar card "Comissões a Pagar" na grelha de stats (junto aos outros cards)
- Visível apenas quando `commissions_enabled = true` no `sales_settings`
- onClick abre o modal
- Usa o hook `useSalesCommissions` existente para o valor do card (soma dos `totalCommission`)
- O modal internamente faz query mais detalhada (com vendas individuais)

**Novo: `src/hooks/useCommissionsDetail.ts`**
- Query que retorna vendas individuais com: `id`, `code`, `sale_date`, `total_value`, `created_by`
- Junta com `organization_members.commission_rate` e profiles para nomes
- Calcula comissão por venda (respeitando global vs individual rate)
- Usado apenas dentro do modal

### Ficheiros
- `src/hooks/useCommissionsDetail.ts` -- novo hook com detalhe por venda
- `src/components/finance/CommissionsPayableModal.tsx` -- modal com tabela detalhada
- `src/pages/Finance.tsx` -- adicionar card clicável na grelha de stats

