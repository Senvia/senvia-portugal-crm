

## Simplificar Compromisso — Resumo por Comercial

### Problema Atual
O sistema pede ao comercial para introduzir linha a linha cada NIF com valores individuais de energia, solar e comissão. Na prática, o comercial só precisa definir **totais** para o mês: quantos NIFs vai fechar, e os totais de energia, solar e comissão.

### Nova Abordagem
Eliminar a tabela `commitment_lines` e guardar os totais diretamente na tabela `monthly_commitments`. O compromisso passa a ser **um único registo por utilizador/mês** com campos de resumo.

### Alterações

**1. Migração SQL**
- Adicionar colunas à `monthly_commitments`: `total_nifs` (integer), `total_energia_mwh` (numeric), `total_solar_kwp` (numeric), `total_comissao` (numeric)
- Migrar dados existentes das `commitment_lines` para os novos campos (SUM dos valores)
- Manter `commitment_lines` mas deixar de a usar (pode ser removida depois)

**2. Hook `useCommitments.ts`**
- Simplificar: deixar de ler/escrever `commitment_lines`
- O `saveCommitment` passa a fazer apenas upsert no `monthly_commitments` com os 4 campos de totais
- Interface `Commitment` simplificada com `total_nifs`, `total_energia_mwh`, `total_solar_kwp`, `total_comissao`

**3. `CommitmentPanel.tsx`**
- Tabela mostra **uma linha por comercial** (admin vê todos os membros da org, comercial vê só o seu)
- Colunas: **Colaborador** | Nº NIFs | Energia (MWh) | Solar (kWp) | Comissão
- Admin vê lista completa com totais no footer; comercial vê apenas a sua linha
- Botão de editar abre modal simplificado

**4. `EditCommitmentModal.tsx`**
- Simplificar para 4 campos apenas: Nº de NIFs, Total Energia, Total Solar, Total Comissão
- Sem sistema de linhas/adicionar/remover

### Resultado Visual (Admin)

```text
┌─────────────┬────────┬──────────┬───────────┬──────────┐
│ Colaborador │ NIFs   │ Energia  │ Solar     │ Comissão │
├─────────────┼────────┼──────────┼───────────┼──────────┤
│ João Silva  │ 5      │ 12.5 MWh │ 8.0 kWp   │ 1.200 € │
│ Ana Costa   │ 3      │ 8.0 MWh  │ 5.0 kWp   │ 800 €   │
├─────────────┼────────┼──────────┼───────────┼──────────┤
│ TOTAL       │ 8      │ 20.5 MWh │ 13.0 kWp  │ 2.000 € │
└─────────────┴────────┴──────────┴───────────┴──────────┘
```

