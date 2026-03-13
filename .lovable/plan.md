

## Mostrar data de agendamento nas campanhas

### Problema
Na `CampaignsTable`, a data exibida por baixo do nome da campanha só mostra duas opções:
- "Enviada a ..." (se `sent_at` existe)
- "Editada a ..." (se não)

Campanhas com estado **"Agendada"** têm o campo `scheduled_at` preenchido, mas este nunca é mostrado na interface.

### Correção
Alterar a lógica de exibição de data (linhas 114-119 de `CampaignsTable.tsx`) para incluir um terceiro caso:

```
Se scheduled_at e status === 'scheduled' → "Agendada para dd/MM/yyyy às HH:mm"
Se sent_at → "Enviada a dd/MM/yyyy às HH:mm"
Senão → "Editada a dd/MM/yyyy às HH:mm"
```

Alteração de ~5 linhas num único ficheiro.

