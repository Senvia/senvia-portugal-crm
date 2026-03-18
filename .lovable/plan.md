

## Atualizar activation_date das vendas de teste para Março 2026

### Problema
As 8 vendas de teste (códigos 0021-0028) têm `activation_date` entre Janeiro e Março de **2025**, mas o dashboard está em Março **2026**. Por isso não aparecem.

### Solução
Atualizar o `activation_date` e `sale_date` de todas as 8 vendas para datas aleatórias em Março 2026 (entre 2026-03-01 e 2026-03-18).

**SQL (via insert tool):**
```sql
UPDATE sales SET activation_date = '2026-03-03', sale_date = '2026-03-03' WHERE id = '1807fcda-947c-4795-9db9-3d9ae7ede7fb';
UPDATE sales SET activation_date = '2026-03-05', sale_date = '2026-03-05' WHERE id = '5a9a7422-c7eb-492f-aaf8-755c3571e6c2';
-- ... (para os 8 IDs: 0021 a 0028)
```

### Ficheiros alterados
Nenhum — apenas atualização de dados existentes.

