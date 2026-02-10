

## Adicionar hora ao agendamento de recontacto do lead perdido

### Problema

Atualmente, quando o lead e movido para "Perdido", o dialog pede a data mas nao a hora. O evento e criado sempre as 10:00 por defeito (hardcoded na linha 279 do Leads.tsx).

### Alteracoes

**1. `src/components/leads/LostLeadDialog.tsx`**

- Adicionar estado `followUpTime` com valor inicial `"10:00"`
- Adicionar um `<Input type="time">` ao lado do input de data, no mesmo grid
- Incluir `followUpTime` no objeto passado ao `onConfirm`
- Atualizar a interface `LostLeadDialogProps.onConfirm` para incluir `followUpTime: string`
- Atualizar o reset do formulario para limpar o `followUpTime` de volta a `"10:00"`
- Na preview da data, mostrar tambem a hora selecionada

Layout dos inputs de data/hora:
```text
[Data de recontacto *]        [Hora *]
[____/____/____]              [10:00]
```

**2. `src/pages/Leads.tsx`**

- Atualizar o tipo do `handleLostConfirm` para incluir `followUpTime: string`
- Na linha 279, usar `data.followUpTime` em vez do `T10:00:00` hardcoded:
  ```
  const followUpDate = new Date(`${data.followUpDate}T${data.followUpTime}:00`);
  ```

| Ficheiro | Alteracao |
|---|---|
| `LostLeadDialog.tsx` | Adicionar input de hora + incluir no onConfirm |
| `Leads.tsx` | Usar hora dinamica em vez de 10:00 hardcoded |

