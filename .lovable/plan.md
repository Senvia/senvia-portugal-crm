

## Alterar datas padrão de recontacto para 15/30/45 dias

### Alteração
No ficheiro `src/components/leads/LostLeadDialog.tsx`, os botões rápidos de data estão hardcoded como 30/60/90 dias. Alterar para **15/30/45 dias**.

### Ficheiro
- `src/components/leads/LostLeadDialog.tsx` — linha ~143: trocar o array `[{ days: 30 }, { days: 60 }, { days: 90 }]` para `[{ days: 15, label: "15 dias" }, { days: 30, label: "30 dias" }, { days: 45, label: "45 dias" }]`

