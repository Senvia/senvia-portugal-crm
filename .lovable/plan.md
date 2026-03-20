
## Correção para o “continua como Nuno Dias” após reimport

### Diagnóstico confirmado
- O reimport **funcionou**: no import mais recente, o CPE `PT1601000000461219MK` está associado à **Ana Calado**.
- O problema é de exibição: a aba “Análise de Comissões” está a ler **todos os imports históricos** da organização, incluindo o import anterior onde esse CPE estava com **Nuno Dias**.
- Resultado: a UI mistura versões antigas + novas e parece que “não atualizou”.

## O que vou implementar

1. **Usar apenas o último import como fonte da análise**
   - No `useCommissionAnalysis`, manter `imports` ordenados por `created_at desc`.
   - Definir `activeImportId = imports[0]?.id`.
   - Filtrar `items` para `item.import_id === activeImportId` antes de montar comerciais, resumo e não associados.

2. **Recalcular toda a análise com base no import ativo**
   - `commercials`, `summary`, `unmatchedItems` passam a usar apenas os itens do último import.
   - Isso garante que o CPE aparece com o comercial da versão mais recente (Ana), sem “sombra” do import antigo.

3. **Mostrar claramente qual import está a ser exibido**
   - Na `CommissionAnalysisTab`, exibir uma linha informativa: nome do ficheiro + data/hora do import ativo.
   - Evita dúvida sobre “qual import está no ecrã”.

4. **(Opcional, para próximo passo) histórico selecionável**
   - Se quiser manter comparação histórica, adiciono um seletor “Import atual” no topo.
   - Padrão continua no último import.

## Arquivos a alterar
- `src/hooks/useCommissionAnalysis.ts` (filtro por `activeImportId`)
- `src/components/finance/CommissionAnalysisTab.tsx` (indicador do import ativo)

## Critério de aceite
- Após reimportar, o CPE `PT1601000000461219MK` aparece apenas com o comercial do último import (Ana), e deixa de aparecer como Nuno na análise atual.
