
# Corrigir Calculo do "Total Faturado" vs "Recebido"

## Problema
Quando um filtro de periodo esta ativo, o "Total Faturado" e menor que o "Recebido" porque usam datas de campos diferentes:
- **Total Faturado**: filtra vendas por `created_at` (data de criacao da venda)
- **Recebido**: filtra pagamentos por `payment_date` (data do pagamento)

Isto gera inconsistencia quando uma venda foi criada fora do periodo mas os pagamentos foram feitos dentro do periodo.

## Solucao
Alterar o calculo do "Total Faturado" para usar a `sale_date` em vez de `created_at`, e incluir tambem as vendas cujos pagamentos caem dentro do periodo selecionado. Duas opcoes:

### Opcao A (Recomendada): Usar `sale_date` para filtrar vendas
Alterar o filtro das vendas de `created_at` para `sale_date`, que e o campo que o utilizador define como data da venda — mais coerente com a realidade comercial.

### Opcao B: Incluir vendas dos pagamentos filtrados
Calcular o "Total Faturado" a partir das vendas associadas aos pagamentos que estao dentro do periodo (evitando duplicados). Isto garante coerencia total entre os dois cartoes.

## Recomendacao
A **Opcao A** e mais simples e resolve o caso mais comum. Se o utilizador tambem quiser coerencia absoluta, a Opcao B pode ser combinada.

## Alteracoes tecnicas

### Ficheiro: `src/hooks/useFinanceStats.ts`

1. **Query das vendas**: adicionar o campo `sale_date` ao SELECT
2. **Filtro de vendas por periodo**: trocar `created_at` por `sale_date` no filtro `filteredSales`

```
// Antes
const date = parseISO(s.created_at);

// Depois
const date = parseISO(s.sale_date);
```

3. Atualizar a query para incluir `sale_date`:
```
.select('id, total_value, created_at, sale_date')
```

## Resultado
Os cartoes "Total Faturado" e "Recebido" passarao a ser coerentes quando um filtro de periodo esta ativo, usando a data da venda em vez da data de criacao do registo.
