

# Corrigir Dropdown de Estado no Modal de Detalhes do Lead

## Problema
O seletor de "Estado" no modal de detalhes do lead usa uma lista fixa de estados (`STATUS_LABELS`) com apenas 6 opcoes: Novo, Contactado, Agendado, Proposta, Ganho, Perdido. No entanto, o pipeline e dinamico (configurado por organizacao na tabela `pipeline_stages`) e pode ter estados adicionais como "Instalacao" ou "Ativo". Quando o lead tem um desses estados dinamicos, o Select fica vazio porque nao encontra correspondencia.

## Solucao
Alterar o `LeadDetailsModal` para usar as etapas dinamicas do pipeline (`usePipelineStages`) em vez do `STATUS_LABELS` hardcoded.

## Alteracoes

### Ficheiro: `src/components/leads/LeadDetailsModal.tsx`

1. Importar o hook `usePipelineStages`
2. Chamar `usePipelineStages()` dentro do componente para obter as etapas reais
3. Substituir o `Object.entries(STATUS_LABELS).map(...)` pelo mapeamento das etapas dinamicas: `stages?.map(stage => ...)` usando `stage.key` como value e `stage.name` como label
4. Manter o `STATUS_LABELS` como fallback caso as etapas ainda nao tenham carregado

### Resultado
- 1 ficheiro alterado
- 0 alteracoes de base de dados
- O dropdown de estado mostra sempre as etapas corretas do pipeline da organizacao
