

## Fix: fbclid deve aparecer em "Dados de Campanha"

### Problema

No `LeadDetailsModal.tsx`, a lista `utmKeys` (linha 135) só inclui `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`. O `fbclid` e outros parâmetros de tracking (como `gclid`, `fbc`, `fbp`) não estão incluídos, por isso aparecem como dados de formulário em vez de "Dados de Campanha".

### Solução

Alterar a linha 135 de `LeadDetailsModal.tsx` para incluir `fbclid`, `gclid`, `fbc`, `fbp`, e `ref` na lista de chaves de campanha:

```typescript
const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'fbc', 'fbp', 'ref'];
```

E adicionar labels legíveis para estes (linha 156):

```typescript
const campaignLabels: Record<string, string> = {
  fbclid: 'Facebook Click ID',
  gclid: 'Google Click ID',
  fbc: 'Facebook Cookie',
  fbp: 'Facebook Browser ID',
  ref: 'Referência',
};
label = campaignLabels[key] || key.replace('utm_', 'UTM ').replace(/^(.)/, (m) => m.toUpperCase());
```

### Ficheiro

| Ficheiro | Alteração |
|---|---|
| `src/components/leads/LeadDetailsModal.tsx` | Expandir `utmKeys` + adicionar labels para tracking params |

