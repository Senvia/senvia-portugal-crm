

## Correcao: Enviar Email de Acesso sem alterar password

### Problema
O botao atual pede uma nova password, redefine-a e envia. O correto e enviar apenas os dados de acesso ja existentes (link, codigo da empresa, email) sem tocar na password.

### Alteracoes

**1. `src/components/settings/TeamTab.tsx`**
- Remover estados de password (`accessPassword`, `accessConfirmPassword`, `showAccessPassword`)
- Substituir o modal complexo por um dialog de confirmacao simples: "Enviar email de acesso para {nome}?"
- O handler chama apenas `send-access-email` sem chamar `manage-team-member` (sem reset de password)
- Enviar `password: null` para a edge function

**2. `supabase/functions/send-access-email/index.ts`**
- Tornar `password` opcional no request
- No template HTML: se password estiver presente, mostrar. Se nao, mostrar "Utilize a sua palavra-passe atual" em vez do campo de password
- Remover `password` da validacao obrigatoria

### Resultado
Admin clica "Enviar Email de Acesso" → confirma → email enviado com link, codigo da empresa e email do utilizador. Sem alterar nada na conta.

