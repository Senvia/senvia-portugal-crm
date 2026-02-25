

## Verificacao da Matriz de Comissoes vs Especificacao

Comparei o print com o estado actual da base de dados e do codigo. Ha **erros significativos** que precisam de ser corrigidos.

### Estado Actual vs Especificacao

| Produto | Print (Correcto) | Base de Dados (Actual) | Estado |
|---------|-----------------|----------------------|--------|
| **Solar** | `tiered_kwp`: Base + (Kwp - KwpMin) * Adicional | `tiered_kwp` com 9 escaloes | CORRECTO |
| **Baterias** | `base_plus_per_kwp`: 10€ + (2€ * Kwp) | `tiered_kwp` (copia do Solar) | ERRADO |
| **Condensadores** | `percentage_valor`: 5% do Valor | `tiered_kwp` (copia do Solar) | ERRADO |
| **Carregadores** | `percentage_valor`: 5% do Valor | `tiered_kwp` (copia do Solar) | ERRADO |
| **Coberturas** | `percentage_valor`: 5% do Valor (sem kWp) | `tiered_kwp` (copia do Solar) | ERRADO |

### Problema Adicional: Produtos Separados vs Combinados

No print, **Baterias** e **Carregadores** sao produtos separados com formulas diferentes:
- Baterias = 10€ + 2€ * Kwp
- Carregadores = 5% do Valor

Mas no sistema estao combinados como **"Carregadores/Baterias"** com uma unica formula. Para aplicar as regras correctas, e necessario separa-los em dois produtos distintos.

### Bug no Codigo: Formula kWp dos Condensadores

No ficheiro `src/types/proposals.ts` linha 153, a formula esta invertida:
- Actual: `(d.valor / 0.67) / 1000` (divide por 0.67)
- Correcto: `(d.valor * 0.67) / 1000` (multiplica por 0.67)

### Bug no Codigo: Coberturas tem campo kWp

O print diz "Coberturas = Valor... nao tem Kwp", mas o codigo na linha 155 inclui `kwp` nos campos. Deve ser removido.

### Bug no Codigo: Carregadores deveria ter kwpAuto

O print mostra que Carregadores tambem usa `KWP = (Valor * 0.67) / 1000`, mas no codigo nao tem `kwpAuto` configurado.

---

### Plano de Correcao

#### 1. Separar "Carregadores/Baterias" em dois produtos

**`src/types/proposals.ts`**:
- Alterar `SERVICOS_PRODUCTS` para `['Solar', 'Baterias', 'Carregadores', 'Condensadores', 'Coberturas']`
- Alterar `SERVICOS_PRODUCT_CONFIGS`:
  - Baterias: campos `['kwp', 'comissao']`
  - Carregadores: campos `['valor', 'kwp', 'comissao']` com `kwpAuto: (d) => d.valor ? (d.valor * 0.67) / 1000 : null`
  - Condensadores: corrigir formula para `(d.valor * 0.67) / 1000`
  - Coberturas: remover `kwp` dos campos, ficar `['valor', 'comissao']`

#### 2. Corrigir a commission_matrix na base de dados

```sql
UPDATE organizations
SET commission_matrix = jsonb_build_object(
  'Solar', commission_matrix->'Solar',
  'Baterias', '{"method":"base_plus_per_kwp","base":10,"ratePerKwp":2}'::jsonb,
  'Carregadores', '{"method":"percentage_valor","rate":5}'::jsonb,
  'Condensadores', '{"method":"percentage_valor","rate":5}'::jsonb,
  'Coberturas', '{"method":"percentage_valor","rate":5}'::jsonb
)
WHERE commission_matrix IS NOT NULL;
```

#### 3. Actualizar icones no CommissionMatrixTab

**`src/components/settings/CommissionMatrixTab.tsx`**: Ajustar o `PRODUCT_ICONS` para os novos nomes separados.

### Detalhe Tecnico

A separacao de "Carregadores/Baterias" pode afectar propostas e vendas existentes que referenciam esse nome. Sera necessario verificar se ha dados guardados com esse valor e migra-los.

