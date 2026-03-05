

## Assinatura de Email por Membro da Equipa

### Resumo

Adicionar um campo `email_signature` (HTML) na tabela `profiles` para que cada membro configure a sua assinatura. A assinatura e editada em Definicoes > Geral > "A Minha Conta". Ao enviar emails (edge function `send-template-email`), a assinatura do utilizador que envia e automaticamente anexada ao final do HTML do template.

### Alteracoes

| Componente | Alteracao |
|---|---|
| **Migracao SQL** | `ALTER TABLE profiles ADD COLUMN email_signature text;` |
| **`src/components/settings/GeneralContent.tsx`** | Adicionar secao "Assinatura de Email" no card "A Minha Conta" com um `<Textarea>` (ou editor simples) para o utilizador escrever/colar a sua assinatura HTML. Botao de guardar junto com os outros dados do perfil. Adicionar preview da assinatura renderizada. |
| **`src/hooks/useProfile.ts`** | Incluir `email_signature` no `mutationFn` do `useUpdateProfile` para persistir o campo. |
| **`src/pages/Settings.tsx`** | Passar `emailSignature` / `setEmailSignature` como props ao `GeneralContent`. Inicializar estado a partir de `profile.email_signature`. |
| **`supabase/functions/send-template-email/index.ts`** | Apos resolver o `userId`, buscar `email_signature` da tabela `profiles`. Se existir, anexar ao final do `htmlContent` antes de enviar via Brevo (com separador `<br><br>---<br>`). |

### Fluxo

1. Utilizador vai a Definicoes > Geral > "A Minha Conta"
2. Preenche o campo "Assinatura de Email" (texto/HTML)
3. Guarda o perfil
4. Quando envia qualquer email (template, marketing, lead), a edge function busca a assinatura do remetente e anexa-a ao corpo do email automaticamente

### Detalhe Tecnico

A assinatura e armazenada como `text` (contem HTML) no perfil. Na edge function, e inserida apos o conteudo do template e antes de qualquer footer customizado, garantindo que cada comercial tem a sua identidade nos emails enviados.

