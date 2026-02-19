
# Matriz de Comissoes Configuravel (Telecom - Servicos)

## Objetivo
Criar uma secao nas Definicoes onde organizacoes telecom podem configurar regras de calculo automatico de comissoes para cada produto de "Outros Servicos". Quando o utilizador preencher os campos (kWp, valor, duracao), a comissao sera calculada automaticamente com base na matriz.

## Estrutura da Matriz

Cada produto (Solar, Carregadores/Baterias, Condensadores, Coberturas) tera uma regra de calculo configuravel:

| Metodo | Formula | Exemplo |
|--------|---------|---------|
| `per_kwp` | comissao = kWp x taxa | kWp=10, taxa=50 -> 500 EUR |
| `percentage_valor` | comissao = valor x % | valor=5000, %=10 -> 500 EUR |
| `fixed` | comissao = valor fixo | sempre 200 EUR |
| `manual` | sem calculo (input manual) | utilizador preenche |

Estrutura JSONB guardada em `organizations.commission_matrix`:

```text
{
  "Solar": { "method": "per_kwp", "rate": 50 },
  "Carregadores/Baterias": { "method": "per_kwp", "rate": 30 },
  "Condensadores": { "method": "percentage_valor", "rate": 10 },
  "Coberturas": { "method": "fixed", "rate": 200 }
}
```

## Alteracoes

### 1. Base de dados
- Adicionar coluna `commission_matrix` (JSONB, nullable) a tabela `organizations`
- Valor default: `null` (quando null, comissao e manual como atualmente)

### 2. Settings - Nova sub-seccao "Matriz de Comissoes"
- Adicionar em **Definicoes Gerais** uma nova sub-seccao `org-matrix`
- Visivel apenas para organizacoes do nicho `telecom`
- UI: Uma card por produto com:
  - Select do metodo (EUR/kWp, % do Valor, Valor Fixo, Manual)
  - Input da taxa/valor (oculto se "Manual")
  - Preview da formula (ex: "Comissao = kWp x 50 EUR")

### 3. Hook `useCommissionMatrix`
- Novo hook que le a matriz da organizacao
- Exporta funcao `calculateCommission(product, detail)` que retorna o valor calculado
- Retorna `null` se o metodo e "manual" ou a matriz nao esta configurada

### 4. Formularios de Propostas
- `CreateProposalModal.tsx` e `EditProposalModal.tsx`:
  - Importar `useCommissionMatrix`
  - Quando o utilizador altera kWp ou valor de um produto, auto-calcular a comissao via matriz
  - Campo comissao fica **read-only** quando a matriz esta ativa para esse produto (com indicador visual)
  - Se a matriz nao esta configurada, manter input manual (comportamento atual)

## Ficheiros a criar
- `src/hooks/useCommissionMatrix.ts` -- hook para ler a matriz e calcular comissoes
- `src/components/settings/CommissionMatrixTab.tsx` -- UI de configuracao da matriz

## Ficheiros a editar
- `src/components/settings/MobileSettingsNav.tsx` -- adicionar sub-seccao `org-matrix`
- `src/pages/Settings.tsx` -- renderizar `CommissionMatrixTab` no case `org-matrix`
- `src/components/proposals/CreateProposalModal.tsx` -- auto-calculo via matriz
- `src/components/proposals/EditProposalModal.tsx` -- auto-calculo via matriz

## Detalhes tecnicos

### Migracao SQL
```text
ALTER TABLE organizations 
ADD COLUMN commission_matrix jsonb DEFAULT NULL;
```

### Hook useCommissionMatrix
```text
- Le organization.commission_matrix
- Exporta calculateCommission(productName, detail) -> number | null
- Logica:
  - "per_kwp": detail.kwp * rate
  - "percentage_valor": detail.valor * rate / 100
  - "fixed": rate
  - "manual" ou sem config: null
```

### Auto-calculo no formulario
Quando `handleUpdateProductDetail` e chamado e o campo alterado e `kwp` ou `valor`:
1. Calcular comissao via `calculateCommission(produto, detail)`
2. Se resultado nao e null, atualizar `detail.comissao` automaticamente
3. Se e null, manter o valor que o utilizador digitou

### UI da Matriz nas Definicoes
- Card com icone Calculator
- Uma linha por produto (Solar, Carregadores, etc.)
- Cada linha: nome do produto, select do metodo, input da taxa
- Botao "Guardar" que chama `updateOrganization({ commission_matrix: ... })`
- Apenas visivel para orgs com `niche === 'telecom'`
