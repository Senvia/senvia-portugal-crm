

# Gatilho com pesquisa no modal de automacoes

## Problema
O campo "Gatilho" no modal de criacao de automacoes usa um Select simples (dropdown), sem possibilidade de escrever/pesquisar. O utilizador quer poder filtrar os gatilhos escrevendo.

## Solucao
Substituir o `Select` do campo "Gatilho" pelo componente `SearchableCombobox` que ja existe no projeto (`src/components/ui/searchable-combobox.tsx`). Este componente suporta pesquisa com texto e e consistente com o design do sistema.

## Alteracoes

### Ficheiro: `src/components/marketing/CreateAutomationModal.tsx`

- Importar o `SearchableCombobox` e o tipo `ComboboxOption`
- Converter o array `TRIGGER_TYPES` para o formato `ComboboxOption[]` (com `value` e `label`)
- Substituir o bloco `Select` do gatilho pelo `SearchableCombobox`
- Ajustar o `onValueChange` para aceitar `string | null` (o `SearchableCombobox` devolve `null` quando nada esta selecionado)

A alteracao e isolada a este unico ficheiro e nao afeta nenhum outro componente.

