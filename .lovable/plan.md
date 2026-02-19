
# Adicionar Comissao por Produto + Totais kWp e Comissao

## Resumo
Adicionar um campo "Comissao" a cada linha de produto nos "Outros Servicos", e mostrar no fundo os totais de kWp e Comissao (soma de todas as linhas). O campo global de comissao passa a ser calculado automaticamente.

## Alteracoes

### 1. Tipos (`src/types/proposals.ts`)
- Adicionar `comissao` ao `ServicosProductDetail`
- Adicionar `'comissao'` ao tipo de campos permitidos em `ServicosProductConfig`
- Adicionar `comissao` a todos os `SERVICOS_PRODUCT_CONFIGS` (todos os produtos terao campo comissao)
- Adicionar `'Comissao (EUR)'` ao `FIELD_LABELS`

### 2. Formulario (`src/components/proposals/CreateProposalModal.tsx`)
- Adicionar campo "Comissao (EUR)" em cada linha de produto (apos o kWp)
- Calcular `totalComissao` via `useMemo` (soma de `comissao` de todos os produtos ativos)
- Remover o input manual de comissao global, substituir por valor calculado (read-only)
- Reordenar os campos em cada linha: campos especificos do produto, depois kWp, depois Comissao
- Na seccao de totais: mostrar kWp Total e Comissao Total lado a lado
- O `comissaoServicos` passa a ser o `totalComissao` calculado (usado na submissao)

### 3. Layout por produto (nova ordem dos campos)

| Produto | Campos inline |
|---------|--------------|
| Solar | Duracao, kWp, Comissao |
| Carregadores/Baterias | kWp, Comissao |
| Condensadores | Duracao, Valor, kWp, Comissao |
| Coberturas | Valor, kWp, Comissao |

### 4. Totais no fundo
- kWp Total (read-only, soma)
- Comissao Total (read-only, soma)

### 5. Validacao
- Manter: `totalKwp > 0`
- Alterar: verificar `totalComissao > 0` em vez de `parseFloat(comissaoServicos) > 0`

### 6. Submissao
- Guardar `comissao` por produto no `servicos_details` JSONB
- Usar `totalComissao` como o valor de `comissao` da proposta

## Ficheiros alterados
- `src/types/proposals.ts`
- `src/components/proposals/CreateProposalModal.tsx`
- `src/components/proposals/EditProposalModal.tsx` (mesma logica)
