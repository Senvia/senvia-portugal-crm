

## Plano: Refatorar Módulo de Comissões

### Mudanças na lógica de negócio

1. **Filtro por `activation_date`** (não `sale_date`) — vendas com status `delivered` filtradas pelo `activation_date` no mês selecionado
2. **Filtro por `negotiation_type`** — apenas propostas com `negotiation_type` = `angariacao` ou `angariacao_indexado` contam para o totalizador
3. **Totalizador global** — soma do `consumo_anual` de todos os CPEs (Angariação + Angariação Indexado) determina o patamar de volume
4. **Vista** — Totalizador global no topo + detalhe por comercial expandível

### Ficheiros a alterar

#### 1. `src/components/finance/CloseMonthModal.tsx`
- Mudar query de vendas: filtrar por `activation_date` em vez de `sale_date`
- Buscar `proposals.negotiation_type` junto com `proposal_cpes`
- Filtrar apenas CPEs cujas propostas têm `negotiation_type` IN (`angariacao`, `angariacao_indexado`)
- Totalizador global: somar todo o `consumo_anual` filtrado → determinar patamar global
- Manter agrupamento por comercial para o detalhe, mas usar o patamar do totalizador global de cada comercial
- Adicionar card de totalizador no topo do preview (Total MWh global, Patamar)

#### 2. `src/components/finance/CommissionsTab.tsx`
- Na vista de mês fechado: adicionar totalizador global no topo do card (soma total MWh + patamar)
- Manter tabela por comercial expandível com CPEs

#### 3. `src/hooks/useCommissionClosings.ts`
- Sem alterações estruturais — os dados já são gravados com `items_detail` JSONB

### Detalhe técnico da query

```text
sales (status=delivered, activation_date no mês)
  → proposals (negotiation_type IN angariacao, angariacao_indexado)
    → proposal_cpes (consumo_anual, margem, comissao, serial_number)
  → leads (assigned_to = comercial)
```

### Fluxo do cálculo

1. Buscar vendas `delivered` com `activation_date` no mês
2. Buscar propostas dessas vendas + filtrar `negotiation_type`
3. Buscar `proposal_cpes` dessas propostas
4. Agrupar por comercial (`assigned_to`)
5. Para cada comercial: somar `consumo_anual` → determinar patamar → recalcular comissão de cada CPE
6. Preview: totalizador global no topo + tabela por comercial

