

## Separar `{{data}}` e `{{data_ativacao}}` como variáveis independentes

### Problema
Atualmente `{{data}}` está a usar a data de ativação como fallback em vez da data atual. O correto é ter duas variáveis distintas:
- `{{data}}` = data atual (quando o email é enviado)
- `{{data_ativacao}}` = data de ativação da venda

### Alterações

**1. `src/types/marketing.ts`** — Adicionar `{{data_ativacao}}` à lista de variáveis disponíveis no editor de templates:
```typescript
export const TEMPLATE_VARIABLES_ORG = [
  // ... existentes ...
  { key: '{{data}}', label: 'Data atual' },
  { key: '{{data_ativacao}}', label: 'Data de ativação' },
];
```

**2. `supabase/functions/process-automation/index.ts`** — Corrigir `{{data}}` para ser sempre a data de hoje, e `{{data_ativacao}}` para usar `activation_date` do record:
```typescript
const variables = {
  data: new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' }),
  data_ativacao: formatDatePT(record.activation_date),
  data_venda: formatDatePT(record.sale_date),
};
```

**3. `supabase/functions/send-template-email/index.ts`** — Garantir que `data_ativacao` é passada pelo recipient variables e não sobrescrita. A variável `data` já é definida como `formatDate()` (hoje) nesta função, que está correto.

