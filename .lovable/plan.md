

## Diagnóstico

Na linha 341 do `Leads.tsx`, quando confirmas o diálogo de "Lead Perdido", o sistema faz duas coisas em paralelo:
1. Muda o status do lead para **perdido** (`pendingLostStatus.status` = stage final negativa)
2. Cria um **evento no calendário** com o recontacto

O lead fica imediatamente como "perdido" no Kanban e o recontacto existe apenas como evento de calendário. O utilizador espera que o lead fique num estado intermédio (ex: "agendado") até à data do recontacto.

## Solução

Alterar o fluxo para que, quando o utilizador agenda um recontacto, o lead **não seja marcado como perdido imediatamente**. Em vez disso:

1. O lead mantém o status atual (ou move para um estado "recontacto" se existir na pipeline)
2. As notas de perda são guardadas normalmente
3. O evento de calendário é criado com a data do follow-up
4. Apenas quando o utilizador decidir no futuro (via calendário ou manualmente) é que marca como perdido definitivamente

### Alterações

| Ficheiro | Ação |
|---|---|
| `src/pages/Leads.tsx` | Alterar `handleLostConfirm` para NÃO mudar o status para perdido quando há follow-up agendado. Manter o status atual do lead |
| `src/components/leads/LostLeadDialog.tsx` | Ajustar texto/UI para refletir que o lead ficará "em espera" com recontacto agendado, não como perdido |

### Lógica no `handleLostConfirm`

```
// Antes (linha 341):
updateStatus.mutate({ leadId: pendingLostStatus.leadId, status: pendingLostStatus.status });

// Depois:
// Não muda o status - o lead fica no estado atual com recontacto agendado
// As notas com o motivo de perda são guardadas na mesma
```

O lead permanecerá visível no Kanban na coluna atual, com as notas do motivo de perda e o evento de recontacto no calendário. O utilizador pode depois decidir movê-lo manualmente para perdido ou para outra etapa.

