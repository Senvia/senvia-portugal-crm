

## Diagnóstico confirmado com dados reais

| Venda | activation_date | negotiation_type | Aparece? |
|-------|----------------|------------------|----------|
| 0011 | 2026-02-27 | angariacao | ✅ Deveria aparecer |
| 0012 | **NULL** | angariacao_indexado | ❌ Excluída pelo filtro |

### Problema da 0012
Foi criada **antes** do deploy do campo "Data de Ativação" no modal de criação. Ficou com `activation_date = NULL`, logo é excluída pelo filtro `.gte('activation_date', monthStart)`.

### Problema da 0011
Se também não aparece na UI, pode ser cache do browser (refresh resolve) ou o mês selecionado no módulo de comissões não é Fevereiro 2026.

### Plano

1. **Corrigir venda 0012 na base de dados** — atualizar `activation_date` para a data correta (ex: `2026-02-27`)
2. **Verificar se a 0011 aparece** — pode ser apenas necessário um refresh da página

Apenas 1 query SQL de update, sem alterações de código.

