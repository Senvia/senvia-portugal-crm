

## Recriar vendas de teste com dados reais do ficheiro de comissões

### Problema
As 8 vendas de teste existentes (0021-0028) têm dados falsos genéricos. O utilizador quer que reflitam os dados reais do ficheiro de comissões EDP, com os CPEs corretos, consumos, margens, DBL, valores de comissão ("Valor a receber"), datas de contrato e empresas.

### Dados do ficheiro (8 CPEs em 5 propostas)

| Proposta EDP | Empresa | NIF | CPE | Consumo | Margem | DBL | Comissão | Data Aceitação | Contrato Início | Contrato Fim |
|---|---|---|---|---|---|---|---|---|---|---|
| 2606180 | SONIA LAVOURA | 509646336 | PT0002000104989706QE | -9785 | 7.003 | 12.561 | -178.35 | 15/05/2025 | 25/05/2025 | 31/12/2027 |
| 2922128 | ACEDE EMPRESA TRABALHO TEMPORARIO SA | 503447994 | PT0002000111166209NJ | 13649 | 15.000 | 15.000 | 414.52 | 19/01/2026 | 22/01/2026 | 31/01/2028 |
| 2922128 | ACEDE | 503447994 | PT0002000100723735BE | 869 | 14.715 | 14.715 | 25.89 | 19/01/2026 | 22/01/2026 | 31/01/2028 |
| 2922128 | ACEDE | 503447994 | PT0002000104382618WL | 489 | 14.179 | 14.179 | 14.04 | 19/01/2026 | 22/01/2026 | 31/01/2028 |
| 2922128 | ACEDE | 503447994 | PT0002000102974369TZ | 3095 | 15.210 | 15.210 | 95.31 | 19/01/2026 | 22/01/2026 | 31/01/2028 |
| 2912666 | PRIMAVERA BSS | 503140600 | PT1601000000461219MK | 15000 | 8.000 | 12.017 | 368.91 | 14/01/2026 | 14/01/2026 | 31/01/2028 |
| 2856046 | ACUSTIKASSUNTO SA | 510864759 | PT1605000000001772QM | 140000 | 8.839 | 10.334 | 2590.19 | 17/11/2025 | 27/11/2025 | 31/12/2027 |
| 2933569 | CASA DE REPOUSO | 503474010 | PT1605000008089920GL | 24000 | 5.750 | 8.684 | 609.26 | 01/02/2026 | 29/01/2026 | 31/12/2028 |

### Plano de execução (SQL migrations)

**1. Apagar dados de teste existentes**
- Apagar 8 proposal_cpes (IDs conhecidos)
- Apagar 8 vendas (0021-0028)
- Apagar 8 propostas associadas

**2. Atualizar/criar 5 clientes falsos** (reutilizar os 5 clientes existentes das vendas apagadas, atualizando nome e NIF):
- SONIA LAVOURA (NIF: 509646336)
- ACEDE EMPRESA TRABALHO TEMPORARIO SA (NIF: 503447994)
- PRIMAVERA BSS (NIF: 503140600)
- ACUSTIKASSUNTO SA (NIF: 510864759)
- CASA DE REPOUSO (NIF: 503474010)

**3. Criar 5 propostas** (tipo energia, status accepted, negotiation_type angariacao):
- Cada uma com `edp_proposal_number` correto (2606180, 2922128, 2912666, 2856046, 2933569)
- `accepted_at` = data de aceitação do ficheiro

**4. Criar 8 proposal_cpes** com dados corretos:
- `serial_number`, `consumo_anual`, `margem`, `dbl`, `comissao` (= Valor a receber), `contrato_inicio`, `contrato_fim`
- A proposta ACEDE terá 4 CPEs; as restantes 1 CPE cada

**5. Criar 5 vendas** (status delivered, payment_status paid):
- `activation_date` e `sale_date` = data de aceitação da proposta
- `client_id` = cliente correspondente
- `proposal_id` = proposta correspondente
- `total_value` = soma dos consumos × margem (ou valor representativo)
- `edp_proposal_number` = número EDP
- Distribuir entre os 4 salespersons da P2G via `assigned_to` dos clientes

### Nota importante
O campo `comissao` no `proposal_cpes` é a comissão indicativa. O sistema pode recalcular via matriz de energia se configurada. Os valores do "Valor a receber" serão inseridos como comissão indicativa.

### Ficheiros alterados
Nenhum — apenas migrações SQL (apagar + inserir dados corretos).

