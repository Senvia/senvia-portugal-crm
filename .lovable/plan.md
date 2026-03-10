

## Plano: Ativações mostram Consumo Contratado (MWh) e kWp em vez de contagem

### Problema atual
A coluna "Ativ." nos cards Energia Mensal e Serviços Mensal mostra uma **contagem** de vendas concluídas (delivered). O pedido é:
- **Energia Mensal** → somar o **Consumo Anual** (da tabela `proposal_cpes.consumo_anual`) das vendas concluídas
- **Serviços Mensal** → somar o **kWp** (de `proposals.servicos_details`) das vendas concluídas

### Alterações

**1. `src/hooks/useActivationObjectives.ts`**
- Nas queries de `monthlyActivations` e `annualActivations`, adicionar `proposal_id` ao select
- Adicionar queries para buscar `proposal_cpes` (consumo_anual) e `proposals` (servicos_details → kWp) associados às vendas concluídas
- Alterar `countActivations` para retornar:
  - Quando `proposalType === "energia"`: soma de `consumo_anual` (convertido a MWh, /1000)
  - Quando `proposalType === "servicos"`: soma de `kWp`
- Renomear internamente para `sumActivations` ou manter nome mas mudar semântica

**2. `src/components/dashboard/ActivationsPanel.tsx`**
- Atualizar labels: "ativações" → "MWh" para energia, "kWp" para serviços
- Formatar valores com casas decimais adequadas (ex: `1.5 MWh`, `3.2 kWp`)
- Ajustar o cálculo de percentagem (%) com os novos valores numéricos vs objetivo

### Lógica de dados
```text
Vendas (status=delivered, activation_date no período)
  └─ proposal_id → proposal_cpes.consumo_anual  (Energia: soma kWh/1000 = MWh)
  └─ proposal_id → proposals.servicos_details    (Serviços: soma kWp)
```

