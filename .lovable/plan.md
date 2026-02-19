

# Tornar Agendamento Obrigatorio ao Marcar Lead como Perdido

## Objetivo
Remover a opcao de desativar o agendamento de recontacto. Sempre que um lead for marcado como "Perdido", o utilizador tem de obrigatoriamente agendar um follow-up futuro.

## Alteracoes

### Ficheiro: `src/components/leads/LostLeadDialog.tsx`

1. Remover o estado `scheduleFollowUp` e o componente `Switch` que permite desativar o agendamento
2. Os campos de data, hora e tipo de evento ficam sempre visiveis (sem condicional)
3. A validacao passa a exigir sempre `followUpDate` preenchido
4. O botao de confirmacao mostra sempre "Confirmar e Agendar" (remover a variante "Perda Definitiva")
5. O `onConfirm` passa sempre `scheduleFollowUp: true`

### Detalhe tecnico

**Remover:**
- Estado `scheduleFollowUp` (linha 64)
- Bloco do Switch (linhas 141-150)
- Condicional `{scheduleFollowUp && ...}` nos campos de data/hora/tipo (linhas 152, 220-221)
- Reset do `scheduleFollowUp` nos handlers (linhas 81, 91)
- Variante do botao com icone `XCircle` (linhas 229-233)

**Alterar:**
- Validacao (linha 96): de `lossReason && (scheduleFollowUp ? followUpDate : true)` para `lossReason && followUpDate`
- `onConfirm` (linha 74): passar sempre `scheduleFollowUp: true`

### Resultado
- 1 ficheiro alterado
- 0 alteracoes de base de dados
- O agendamento de recontacto torna-se obrigatorio em todos os casos
