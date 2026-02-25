

## Recalcular Comissões de Propostas e Vendas Existentes (Perfect2Gether)

### Dados Analisados

Consultei a base de dados e identifiquei os registos de **Outros Serviços** que precisam de recalcular comissões usando a matriz configurada.

### Matriz de Comissões Actual (Solar - tiered_kwp)

```text
Tier          | baseTrans | adicTrans | baseAas | adicAas
0 - 1.2 kWp   |     0     |     0     |    0    |    0
1.2 - 4.1     |    42     |     0     |   34    |    0
4.1 - 15      |    42     |    10     |   34    |   14
15 - 25       |   140     |     7     |  190    |   11
25 - 50       |   210     |     6     |  320    |   10
50 - 100      |   340     |     6     |  542    |    7
100 - 250     |   600     |     5     |  872    |    6
250 - 500     |  1320     |     5     | 1826    |    6
500 - 1000    |  2440     |     4     | 3380    |    6
```

### Recalculos Necessarios

#### Propostas de Servicos

| Proposta | Produto | kWp | Modelo | Comissao Actual | Comissao Correcta | Calculo |
|---|---|---|---|---|---|---|
| 0015 | Solar | 45 | Transacional | 300 | **330** | Tier 25-50: 210 + (45-25)*6 = 330 |
| 0016 | Solar | 28 | Transacional | 200 | **228** | Tier 25-50: 210 + (28-25)*6 = 228 |
| 0019 | Solar+Baterias | 10+10 | SAAS | 146.6 | **146.6** (correcto) | Solar: 34+(10-4.1)*14=116.6 + Bat: 10+2*10=30 |

#### Vendas de Servicos

| Venda | Produto | kWp | Modelo | Comissao Actual | Comissao Correcta |
|---|---|---|---|---|---|
| 0003 | Solar | 28 | Transacional | 200 | **228** |
| 0005 | Solar | 28 | Transacional | 200 | **228** |
| 0008 | Solar | 28 | Transacional | 200 | **228** |

#### Propostas de Energia
As propostas de energia (0001-0014, 0017-0018, 0020-0021) usam comissao por CPE, nao pela matriz de servicos — os valores dos CPEs ja estao correctos na tabela `proposal_cpes`.

### Implementacao

Criar uma edge function temporaria `recalc-commissions` que:

1. Actualiza **Proposta 0015**: comissao=330, servicos_details={"Solar": {"kwp": 45, "comissao": 330}}
2. Actualiza **Proposta 0016**: comissao=228, servicos_details={"Solar": {"kwp": 28, "comissao": 228}}
3. Actualiza **Venda 0003**: comissao=228
4. Actualiza **Venda 0005**: comissao=228
5. Actualiza **Venda 0008**: comissao=228

Tambem migra `servicos_details` para as propostas 0015 e 0016 que tinham dados legacy (kwp no nivel superior sem servicos_details).

### Ficheiros

| Ficheiro | O que muda |
|---|---|
| `supabase/functions/recalc-commissions/index.ts` | Edge function temporaria para executar os updates |

Apos execucao com sucesso, a edge function sera eliminada.

