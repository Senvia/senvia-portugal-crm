

## Problema identificado

As 8 vendas de teste foram criadas **sem `activation_date`** (todas com `NULL`). O hook `useLiveCommissions` filtra vendas por `activation_date` (linhas 96-97), logo vendas sem essa data são completamente ignoradas na análise de comissões.

## Solução

**Migração SQL** para atualizar as 8 vendas de teste, preenchendo o `activation_date` com a mesma data do `sale_date` de cada uma.

```sql
UPDATE sales 
SET activation_date = sale_date 
WHERE organization_id = '96a3950e-31be-4c6d-abed-b82968c0d7e9'
  AND activation_date IS NULL
  AND status = 'delivered';
```

Isto fará com que as vendas apareçam na análise de comissões quando o mês correspondente estiver selecionado.

### Nota
As vendas têm `sale_date` variando entre Janeiro e Março 2025 — certifique-se de que o filtro de mês no dashboard corresponde a esses períodos para visualizar os dados.

