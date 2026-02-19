

# Redesenhar "Outros Servicos" nas Propostas Telecom

## Resumo
Reestruturar a seccao "Outros Servicos" para que cada produto tenha campos especificos em linha, com calculos automaticos de kWp onde aplicavel. O modelo de servico (Transacional/SAAS) passa a aparecer primeiro.

## Nova Estrutura por Produto

Cada produto tem campos especificos numa linha horizontal:

| Produto | Campos | kWp |
|---------|--------|-----|
| Solar | Duracao, kWp | Manual |
| Carregadores/Baterias | kWp | Manual |
| Condensadores | Duracao, Valor, kWp | Auto: (Valor / 0.67) / 1000 |
| Coberturas | Valor, kWp | Auto (formula a definir, por agora manual) |

## O que muda

### 1. Migracao de Base de Dados
Adicionar coluna JSONB `servicos_details` na tabela `proposals` para guardar os dados por produto:
```json
{
  "Solar": { "duracao": 5, "kwp": 6.5 },
  "Carregadores/Baterias": { "kwp": 3.2 },
  "Condensadores": { "duracao": 3, "valor": 5000, "kwp": 7.46 },
  "Coberturas": { "valor": 8000, "kwp": 4.0 }
}
```
O campo `kwp` existente passa a guardar o total (soma de todos). Os campos `servicos_produtos` continuam a funcionar como lista dos produtos selecionados.

### 2. Tipos (`src/types/proposals.ts`)
- Adicionar interface `ServicosProductDetails` com os campos por produto
- Adicionar tipo `ServicosDetails` como Record de produto para detalhes
- Definir configs por produto (quais campos cada um tem, formula de kWp)

### 3. Formulario de Criacao (`CreateProposalModal.tsx`)
Redesenhar a seccao de servicos:
1. **Modelo de Servico** aparece primeiro (Transacional / SAAS)
2. **Produtos em linha** - cada produto e uma linha com checkbox + campos inline:
   - Checkbox para ativar/desativar o produto
   - Campos especificos aparecem quando ativado
   - kWp calculado automaticamente para Condensadores (e Coberturas quando tiver formula)
3. **Totais** - kWp total e comissao no resumo lateral

### 4. Formulario de Edicao (`EditProposalModal.tsx`)
- Mesma logica do formulario de criacao
- Carregar `servicos_details` do proposal existente

### 5. Modal de Detalhes (`ProposalDetailsModal.tsx`)
- Mostrar cada produto ativo com os seus campos numa tabela/grid
- Mostrar kWp calculados vs manuais

### 6. Submissao e Logica
- Na submissao, construir o objeto `servicos_details` e calcular `kwp` total
- Formula Condensadores: kWp = (valor / 0.67) / 1000
- Formula Coberturas: por agora kWp manual (a definir depois)

## Ficheiros alterados
- **Migracao SQL**: Adicionar coluna `servicos_details` (JSONB) a `proposals`
- `src/types/proposals.ts`: Novos tipos e configuracao por produto
- `src/components/proposals/CreateProposalModal.tsx`: Redesenhar seccao servicos
- `src/components/proposals/EditProposalModal.tsx`: Mesma reestruturacao
- `src/components/proposals/ProposalDetailsModal.tsx`: Visualizacao atualizada
- `src/hooks/useProposals.ts`: Guardar/ler `servicos_details`

