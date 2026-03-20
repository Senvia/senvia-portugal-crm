

## Apagar dados de chargebacks da Perfect2Gether e verificar implementação

### Dados a apagar

Na org Perfect2Gether existem:
- **2 imports** (`commission_chargeback_imports`): `79362920-...` e `3436e079-...`
- **2 items** (`commission_chargeback_items`): `1039cb53-...` e `33eb965e-...`

Ambos são duplicados do mesmo CPE (`PT0002000104989706QE`) com `raw_row` incompleto (só tem `cpe` e `chargeback_amount`, sem os dados completos do ficheiro EDP).

### Execução
1. DELETE dos 2 `commission_chargeback_items` (apagar primeiro por FK)
2. DELETE dos 2 `commission_chargeback_imports`

### Verificação do que foi implementado

Tudo o que foi pedido já está no código:

- **Matching por CPE + Cliente** — `matchFileToSystem()` no `CommissionAnalysisTab.tsx` normaliza CPEs e faz match
- **Colunas do ficheiro exibidas** — Tipo de Comissão, Nome da Empresa, Tipo, CPE, Consumo anual, Duração, Data Início, Data Fim, DBL, Valor a receber
- **Colunas do sistema lado a lado** — Consumo (sistema), Margem (sistema), Comissão (sistema)
- **Highlight de discrepâncias** — valores diferentes entre ficheiro e sistema aparecem em amarelo
- **Accordion por comercial** — cada comercial expande para mostrar CPEs
- **Auto-detecção da coluna CPE** — `ImportChargebacksDialog` prioriza "Linha de Contrato: Local de Consumo"
- **`raw_row` parsed** — `useCommissionAnalysis.ts` tem `parseRawRow()` que extrai todas as colunas EDP relevantes
- **Secções separadas** — CPEs matched, CPEs só no sistema, CPEs só no ficheiro

### Ficheiros alterados
Nenhum — apenas DELETE de dados via SQL.

