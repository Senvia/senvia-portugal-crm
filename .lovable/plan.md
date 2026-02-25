

## Copiar Escalões Solar para Carregadores, Condensadores e Coberturas

### Situação actual

A organização `Perfect2Gether` tem 9 escalões configurados no produto **Solar** (método `tiered_kwp`), enquanto **Carregadores/Baterias**, **Condensadores** e **Coberturas** estão em modo `manual`.

### O que vou fazer

Alterar o `CommissionMatrixTab.tsx` para não ser necessário — isto é uma alteração de **dados**, não de código. Vou actualizar directamente o campo `commission_matrix` na base de dados, copiando a regra Solar (com todos os 9 escalões) para os outros 3 produtos.

### Dados a copiar (Solar → todos)

| kWp Min | kWp Max | Base Trans. | Adic. Trans. | Base AAS | Adic. AAS |
|---------|---------|-------------|--------------|----------|-----------|
| 0       | 1.2     | 0           | 0            | 0        | 0         |
| 1.2     | 4.1     | 42          | 10           | 34       | 14        |
| 4.1     | 15      | 42          | 10           | 34       | 14        |
| 15      | 25      | 140         | 7            | 190      | 11        |
| 25      | 50      | 210         | 6            | 320      | 10        |
| 50      | 100     | 340         | 6            | 542      | 7         |
| 100     | 250     | 600         | 5            | 872      | 6         |
| 250     | 500     | 1320        | 5            | 1826     | 6         |
| 500     | 1000    | 2440        | 4            | 3380     | 6         |

### Alteração

Uma única query SQL que copia os tiers do Solar para os outros 3 produtos no JSONB `commission_matrix`, mantendo o Solar intacto.

### Detalhe técnico

```sql
UPDATE organizations
SET commission_matrix = jsonb_set(
  jsonb_set(
    jsonb_set(
      commission_matrix,
      '{Carregadores/Baterias}', commission_matrix->'Solar'
    ),
    '{Condensadores}', commission_matrix->'Solar'
  ),
  '{Coberturas}', commission_matrix->'Solar'
)
WHERE id = '96a3950e-31be-4c6d-abed-b82968c0d7e9';
```

Nenhum ficheiro de código será alterado. Apenas dados na base de dados.

