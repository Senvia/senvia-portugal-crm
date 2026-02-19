

# Auto-calcular Duracao do Contrato a partir das Datas

## Resumo
Quando o utilizador preenche a data de inicio e a data de fim do contrato num CPE, a duracao (em anos) e calculada automaticamente pela diferenca de dias dividida por 365, com 3 casas decimais. O campo "Fim Contrato" passa a ser editavel.

## O que muda

No ficheiro `src/components/proposals/ProposalCpeSelector.tsx`:

1. **Tornar o campo "Fim Contrato" editavel** - remover o `disabled` e `bg-muted`, adicionar `onChange`
2. **Adicionar logica de calculo automatico da duracao** - quando `contrato_fim` e alterado (e `contrato_inicio` existe), calcular: `(diferenca em dias) / 365` com 3 casas decimais e preencher `duracao_contrato`
3. **Manter a logica existente** - quando `duracao_contrato` e alterado manualmente com `contrato_inicio`, continua a calcular o `contrato_fim` automaticamente
4. **Alterar o label "Duracao (anos)"** para indicar que pode ser auto-calculado (adicionar icone Calculator)

## Logica de calculo

```text
Quando contrato_inicio + contrato_fim estao preenchidos:
  dias = (Date(contrato_fim) - Date(contrato_inicio)) em milissegundos / 86400000
  duracao = (dias / 365).toFixed(3)
```

## Fluxo bidirecional

- Utilizador altera "Inicio" + "Fim" -> Duracao calculada automaticamente
- Utilizador altera "Inicio" + "Duracao" -> Fim calculado automaticamente (ja existe)
- Utilizador altera "Fim" -> Duracao recalculada (se inicio existe)

## Ficheiros alterados
- `src/components/proposals/ProposalCpeSelector.tsx`

