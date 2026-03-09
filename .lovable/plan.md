

## Bug: Botão "Criar Lead" não funciona

### Causa Raiz

O formulário está a falhar silenciosamente na **validação do Zod** — sem erro visível para o utilizador. Dois problemas:

1. **Checkbox RGPD começa como `undefined`** (linha 136), mas o schema exige `z.literal(true)`. Isto causa:
   - O warning de consola "Checkbox is changing from uncontrolled to controlled"
   - A validação falha silenciosamente ao clicar "Criar Lead" se o checkbox não estiver marcado
   - O erro de validação pode não estar visível porque o `FormMessage` está numa posição que pode não ser scrollada até lá

2. **Botão de submit tem handler duplicado** (linha 738-742): tem `type="submit"` E `onClick={form.handleSubmit(onSubmit)}`. Isto pode causar conflitos ou dupla execução.

### Correção

**Ficheiro: `src/components/leads/AddLeadModal.tsx`**

1. **Mudar o default de `gdpr_consent`** de `undefined` para `false` (linha 136) — resolve o warning de controlled/uncontrolled
2. **Remover o `onClick` duplicado** do botão submit (linha 742) — manter apenas `type="submit"` que já aciona o `form.handleSubmit(onSubmit)` no `<form>`
3. **Adicionar scroll automático ao primeiro erro** — usar `form.handleSubmit` com error handler que faz scroll até o campo com erro, para que o utilizador veja a mensagem (ex: "Consentimento RGPD é obrigatório")

### Impacto
- Corrige o botão "Criar Lead" para funcionar quando todos os campos obrigatórios estão preenchidos
- Mostra erros de validação visíveis ao utilizador quando algo falta

