

## Adicionar opcao "Perdido Definitivo" ao dialog de lead perdido

### Problema

Atualmente, sempre que um lead e movido para "Perdido", o dialog obriga a agendar um follow-up. Isto cria um ciclo infinito: Perdido -> Follow-up -> Perdido -> Follow-up...

Precisa existir uma forma de marcar o lead como **perdido definitivo** sem agendar recontacto.

### Solucao

Adicionar um **switch/checkbox** no `LostLeadDialog` que permite ao utilizador escolher entre:
- **Agendar recontacto** (comportamento atual, por defeito)
- **Perdido definitivo** (sem follow-up, apenas motivo e notas)

Quando "Perdido definitivo" esta ativo, os campos de data, hora e tipo de evento ficam escondidos e deixam de ser obrigatorios.

### Fluxo do utilizador

```text
1. Lead move para "Perdido"
2. Dialog abre com switch: "Agendar recontacto" (ON por defeito)
   - ON: mostra campos de data/hora/tipo (como atualmente)
   - OFF: esconde esses campos, so pede motivo + notas
3. Botao muda de texto:
   - ON: "Confirmar e Agendar"
   - OFF: "Confirmar Perda Definitiva"
```

### Alteracoes tecnicas

**1. `src/components/leads/LostLeadDialog.tsx`**

- Adicionar estado `scheduleFollowUp` (booleano, `true` por defeito)
- Adicionar um `Switch` com label "Agendar recontacto futuro"
- Quando `scheduleFollowUp` e `false`:
  - Esconder secao de data/hora e tipo de evento
  - Campos de follow-up deixam de ser obrigatorios
  - `followUpDate` e `followUpTime` sao enviados como strings vazias
- Atualizar `onConfirm` para incluir `scheduleFollowUp: boolean`
- Atualizar validacao: se `scheduleFollowUp` e true, exigir data; se false, so exigir motivo
- Mudar texto do botao conforme o modo

**2. `src/pages/Leads.tsx`**

- No `handleLostConfirm`, verificar `data.scheduleFollowUp`
- Se `true`: criar evento no calendario (comportamento atual)
- Se `false`: apenas atualizar status e notas, sem criar evento

| Ficheiro | Alteracao |
|---|---|
| `LostLeadDialog.tsx` | Adicionar switch "Agendar recontacto" + esconder campos quando OFF |
| `Leads.tsx` | Condicionar criacao de evento ao valor de `scheduleFollowUp` |

