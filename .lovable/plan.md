

## Reestruturar a página de Análise de Comissões — matching ficheiro vs sistema

### Conceito
Quando o utilizador importa o ficheiro EDP, o sistema faz match por **CPE** (coluna "Linha de Contrato: Local de Consumo") e por **Nome da Empresa** (contra o cliente da venda no sistema). A página passa a mostrar uma tabela comparativa: vendas no sistema vs dados do ficheiro, lado a lado.

### Fluxo de importação (alterado)

1. O utilizador carrega o ficheiro (como já faz)
2. O sistema auto-detecta as colunas relevantes do ficheiro:
   - "Linha de Contrato: Local de Consumo" → CPE para match
   - "Nome da Empresa" → validação cruzada com cliente
3. Em vez de enviar apenas CPE+valor para o RPC, envia a **linha completa** (já acontece — campo `raw_row`)
4. Após importação, a página mostra os dados do ficheiro cruzados com as vendas do sistema

### Dados a exibir na tabela principal

Para cada CPE matched, mostrar:

| Do Ficheiro | Do Sistema |
|---|---|
| Tipo de Comissão | — |
| Nome da Empresa | Cliente (do sistema) |
| Tipo | — |
| CPE (Local de Consumo) | CPE (serial_number) |
| Consumo anual | Consumo anual |
| Duração contrato (anos) | Duração contrato |
| Data de início | contrato_inicio |
| Data Fim de Contrato | contrato_fim |
| DBL | DBL (margem) |
| Valor a receber (Comissão) | Comissão indicativa |

### Alterações técnicas

**1. Alterar a SQL function `import_commission_chargebacks`** (migração)
- Já guarda `raw_row` com todos os dados da linha — OK
- Pode continuar a funcionar como está, o `raw_row` já tem tudo

**2. Novo hook `useCommissionFileAnalysis`** (ficheiro novo)
- Busca os `commission_chargeback_items` com `raw_row` incluído
- Busca as vendas matched (via `matched_sale_id`) com os proposal_cpes e clientes
- Constrói uma estrutura comparativa: dados do ficheiro + dados do sistema, por CPE
- Agrupa por comercial (como já faz)

**3. Reestruturar `CommissionAnalysisTab.tsx`**
- Manter os summary cards no topo
- A tabela principal passa a ser uma tabela de comparação ficheiro vs sistema
- Cada linha mostra um CPE com as colunas do ficheiro (extraídas do `raw_row`) e as colunas correspondentes do sistema
- Manter accordion por comercial: expandir mostra os CPEs desse comercial
- Dentro do accordion, a sub-tabela tem colunas: Tipo Comissão, Empresa (ficheiro), Cliente (sistema), Tipo, CPE, Consumo (ficheiro vs sistema), Duração, Data Início, Data Fim, DBL/Margem, Valor a receber
- Highlight visual quando há discrepância entre ficheiro e sistema (ex.: consumo diferente)
- CPEs do sistema sem match no ficheiro aparecem numa secção separada
- CPEs do ficheiro sem match no sistema aparecem na secção "Não associados" (já existe)

**4. Atualizar `useCommissionAnalysis.ts`**
- Expandir o select dos `commission_chargeback_items` para incluir `raw_row`
- Passar os dados do `raw_row` para a interface de análise, parseando as colunas relevantes:
  - `Tipo de Comissão`, `Nome da Empresa`, `Tipo`, `Linha de Contrato: Local de Consumo`, `Linha de Contrato: Consumo anual`, `Duração contrato (anos)`, `Linha de Contrato: Data de inicio`, `Linha de Contrato: Data Fim de Contrato`, `DBL`

**5. Atualizar `ImportChargebacksDialog.tsx`**
- Adicionar auto-detecção da coluna "Linha de Contrato: Local de Consumo" como coluna CPE
- Manter a detecção existente como fallback

### Ficheiros alterados
- `src/hooks/useCommissionAnalysis.ts` — expandir dados com raw_row parsed
- `src/components/finance/CommissionAnalysisTab.tsx` — nova tabela comparativa com colunas do ficheiro
- `src/components/finance/ImportChargebacksDialog.tsx` — melhorar auto-detecção de colunas

### Nota
Não é necessária migração SQL — o campo `raw_row` já guarda a linha completa do ficheiro. Apenas precisamos de ler e exibir esses dados no frontend.

