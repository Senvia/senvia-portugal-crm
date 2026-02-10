

## Melhorias no modal "Acesso Criado com Sucesso"

### O que vai mudar

**1. Mostrar o Codigo da Empresa no modal**

Adicionar um novo campo "Codigo da Empresa" no modal de sucesso, entre o "Link de Acesso" e o "Email", mostrando o slug da organizacao (que o colaborador precisa para fazer login). O valor vem do `useAuth()` que ja tem `organization.organization_slug`.

**2. Botao "Enviar Acesso por Email"**

Adicionar um botao que envia um email ao novo colaborador com todas as credenciais: link de acesso, codigo da empresa, email e password. O email sera enviado via Brevo (ja configurado por organizacao).

**3. Nova Edge Function para enviar o email**

Criar uma edge function `send-access-email` que recebe os dados do novo membro e envia um email formatado via Brevo com as credenciais de acesso.

---

### Detalhes tecnicos

**Ficheiro: `src/components/settings/TeamTab.tsx`**

- Obter `organization` do `useAuth()` (ja importado)
- No bloco do modal de sucesso (linhas 353-411), adicionar:
  - Campo "Codigo da Empresa" com o valor `organization.organization_slug` e botao de copiar
  - Botao "Enviar Acesso por Email" com icone `Mail` que invoca a edge function
  - Estado `sendingEmail` para controlar o loading do botao

**Ficheiro novo: `supabase/functions/send-access-email/index.ts`**

- Recebe: `organizationId`, `recipientEmail`, `recipientName`, `loginUrl`, `companyCode`, `password`
- Busca a organizacao para obter `brevo_api_key` e `brevo_sender_email`
- Envia email via Brevo API com template HTML profissional contendo todas as credenciais
- Retorna sucesso ou erro

**Estado do `createdMember`**

- Alterar de `{ email: string; password: string }` para incluir tambem `fullName: string` para personalizar o email

### Fluxo

1. Admin cria membro -> modal de sucesso aparece com link, codigo da empresa, email e password
2. Admin clica "Enviar Acesso por Email" -> edge function envia email via Brevo da organizacao
3. Colaborador recebe email com todas as informacoes para aceder ao sistema
