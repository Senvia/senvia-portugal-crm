
Objetivo

Criar um link público de “Cancelar Subscrição” para usar no HTML do email. Ao clicar:
- o contacto é marcado como `subscribed = false`
- ele pode ser adicionado automaticamente à lista “Removidos da Newsletter”
- o utilizador vê uma confirmação direta numa página pública simples

O que confirmei no código

- Já existe suporte no editor/campanha para inserir um link personalizado com `{{unsubscribe}}`:
  - `src/components/marketing/CreateCampaignModal.tsx`
  - `supabase/functions/send-template-email/index.ts`
  - `supabase/functions/process-scheduled-campaigns/index.ts`
- Os contactos de marketing já têm o campo `subscribed`:
  - `supabase/migrations/20260213161256_b8d171a9-a6ba-40da-974c-8f9b1d2608c9.sql`
- As listas de marketing usam `client_lists` + `marketing_list_members`
- Hoje não existe rota pública para unsubscribe no frontend:
  - `src/App.tsx`
- A UI de listas só mostra contactos ativos (`subscribed = true`) no hook principal:
  - `src/hooks/useContactLists.ts`

Decisões já confirmadas por ti

- Além de ir para removidos: marcar `unsubscribed`
- Experiência: confirmação direta

Abordagem recomendada

1. Criar endpoint público de cancelamento
- Adicionar uma backend function pública para receber um token/ID seguro no URL.
- Essa function vai:
  - validar os dados do pedido
  - localizar o contacto pelo email/message/campaign
  - marcar `marketing_contacts.subscribed = false`
  - garantir que a lista “Removidos da Newsletter” existe
  - adicionar o contacto à lista
  - opcionalmente marcar o registo de envio como `unsubscribed` quando houver correspondência

2. Criar página pública de confirmação
- Adicionar uma rota pública, por exemplo `/unsubscribe`
- Essa página:
  - lê os parâmetros do link
  - chama a backend function
  - mostra estados simples:
    - a processar
    - removido com sucesso
    - link inválido/expirado

3. Gerar o link automaticamente para campanhas e envios
- Em vez de depender de URL manual, montar automaticamente o link de unsubscribe durante o envio.
- O `{{unsubscribe}}` passará a ser substituído por um link real com os identificadores necessários.
- Isto deve funcionar tanto em:
  - envio imediato
  - campanhas agendadas

4. Garantir lista “Removidos da Newsletter”
- Criar via migration uma forma segura de garantir esta lista por organização.
- Pode ser:
  - lista criada on-demand pela function, ou
  - função SQL reutilizável semelhante às auto-lists já existentes
- Preferência: criar/garantir via função SQL reutilizável e usar essa função no fluxo

5. Ajustar métricas e consistência
- Se o unsubscribe vier de um email enviado pela campanha, atualizar `email_sends.status = 'unsubscribed'` quando houver `messageId` ou registo equivalente.
- Isso mantém os relatórios coerentes com o que já existe em `EmailSendStatus`.

Ficheiros que devem ser alterados

Frontend
- `src/App.tsx`
- nova página pública, por exemplo:
  - `src/pages/Unsubscribe.tsx`

Backend
- nova backend function pública para unsubscribe
- `supabase/functions/send-template-email/index.ts`
- `supabase/functions/process-scheduled-campaigns/index.ts`

Base de dados
- nova migration para garantir a lista “Removidos da Newsletter”
- possivelmente uma função SQL helper para criar/obter essa lista por organização

Detalhe técnico importante

Como o link será usado por pessoas não autenticadas, ele não pode depender de sessão iniciada.
Por isso, o link deve levar informação suficiente para identificar o contacto com segurança. A melhor opção é usar um token assinado/único no link, em vez de expor apenas email cru.

Fluxo previsto
```text
Email HTML
  -> {{unsubscribe}} substituído por link público
  -> cliente clica
  -> página pública chama backend
  -> backend marca subscribed=false
  -> backend adiciona à lista "Removidos da Newsletter"
  -> página mostra confirmação
```

Notas de implementação

- Não vou alterar a lógica principal das campanhas além da substituição do link.
- O comportamento atual de listas ativas continua intacto, porque os hooks já filtram `subscribed = true`.
- Se quiseres, numa segunda fase posso também criar uma página pública mais bonita com branding e texto legal/GDPR.

Resultado esperado

- Podes usar `{{unsubscribe}}` no template HTML
- O cliente clica e é removido da newsletter automaticamente
- O contacto deixa de aparecer nas listas ativas
- O contacto entra na lista “Removidos da Newsletter”
- A pessoa vê confirmação imediata sem precisar de login
