

## Diagnóstico

O problema está claro no `submit-lead/index.ts` (linhas 462-554):

- **Hardcoded**: Usa sempre `BREVO_API_KEY` (secret global da Senvia) e `notificacoes@senvia.pt` como remetente
- **Ignora completamente** o `brevo_api_key` e `brevo_sender_email` da organização, que já são fetched na query (linha 97) mas nunca usados para email

O `process-automation/index.ts` já delega corretamente ao `send-template-email`, que usa as credenciais da org. Mas o email de notificação hardcoded no `submit-lead` bypassa tudo isso.

---

## Plano de Correção

### 1. Corrigir `supabase/functions/submit-lead/index.ts` (linhas 462-554)

Substituir toda a secção de email notification com esta lógica:

```
SE org.brevo_api_key E org.brevo_sender_email existem:
  → Usar org.brevo_api_key como api-key
  → Usar org.brevo_sender_email como sender email
  → Usar org.name como sender name
SENÃO:
  → Usar BREVO_API_KEY (secret global)
  → Usar "geral@senvia.pt" como sender email  
  → Usar "Senvia" como sender name
```

O HTML template e lógica de fetch admins/assigned mantêm-se iguais, só muda a chave API e o remetente.

### 2. Corrigir `supabase/functions/process-automation/index.ts`

Adicionar verificação: **só executar automações se a organização tiver `brevo_api_key` configurada**. Se não tiver, skip silenciosamente com log.

Isto significa adicionar um fetch à tabela `organizations` para verificar `brevo_api_key` antes de processar os templates.

### Ficheiros a editar

| Ficheiro | Alteração |
|---|---|
| `supabase/functions/submit-lead/index.ts` | Linhas 462-554: usar credenciais Brevo da org, fallback para `geral@senvia.pt` |
| `supabase/functions/process-automation/index.ts` | Adicionar check de `brevo_api_key` da org antes de executar automações |

### Resultado esperado

- Lead entra → email de notificação sai do email verificado Brevo do cliente (ex: `contacto@escolhainteligente.pt`)
- Se cliente não tem Brevo → email sai de `geral@senvia.pt` via chave Senvia
- Automações de templates → só disparam se org tem Brevo ativo
- `notificacoes@senvia.pt` eliminado completamente do código

