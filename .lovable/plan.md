

## Anexos no Ticket de Suporte via Otto

### Objetivo

Permitir que o utilizador anexe ficheiros (screenshots, PDFs, imagens) diretamente no chat do Otto durante o fluxo de ticket de suporte, e enviar esses ficheiros junto com o ticket via WhatsApp.

### Arquitetura

1. **Storage bucket** `support-attachments` (privado) para guardar os ficheiros
2. **Botao de anexo** no chat do Otto (icone de clip) ao lado do input de texto
3. **Upload no frontend** direto para o bucket via Supabase Storage SDK
4. **URLs dos ficheiros** enviados como parametro na ferramenta `submit_support_ticket`
5. **WhatsApp**: enviar imagens/documentos via Evolution API (`sendMedia` endpoint) alem da mensagem de texto

### Alteracoes por ficheiro

**1. Migracao SQL** - Criar bucket `support-attachments`

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('support-attachments', 'support-attachments', false, 10485760, 
  ARRAY['image/jpeg','image/png','image/webp','application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- RLS: membros autenticados podem inserir
CREATE POLICY "Users upload support attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'support-attachments' AND auth.role() = 'authenticated');

-- RLS: service role pode ler (para enviar via WhatsApp na edge function)
CREATE POLICY "Service role reads support attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'support-attachments');
```

**2. Coluna na tabela `support_tickets`** - Adicionar campo `attachments` (jsonb) para guardar os paths dos ficheiros.

**3. `src/stores/useOttoStore.ts`** - Adicionar estado para anexos pendentes:
- `pendingAttachments: File[]`
- `addAttachment(file: File)`
- `removeAttachment(index: number)`
- `clearAttachments()`

**4. `src/hooks/useOttoChat.ts`** - Alterar `sendMessage` para:
- Aceitar um parametro opcional `attachments?: File[]`
- Fazer upload dos ficheiros para `support-attachments/{org_id}/{timestamp}_{filename}`
- Incluir os paths no corpo do pedido ao edge function quando a mensagem confirma o envio do ticket

**5. `src/components/otto/OttoChatWindow.tsx`** - Adicionar:
- Botao de anexo (icone `Paperclip`) ao lado do input
- Input file oculto (aceita imagens e PDFs)
- Preview dos ficheiros selecionados acima do input (com botao de remover cada um)
- Upload dos ficheiros quando o utilizador envia a mensagem de confirmacao

**6. `supabase/functions/otto-chat/index.ts`** - Alterar:
- Aceitar `attachment_paths` no body do request
- Atualizar a ferramenta `submit_support_ticket` para aceitar parametro `attachment_paths`
- Guardar os paths na coluna `attachments` do ticket
- Gerar signed URLs para cada ficheiro
- Enviar ficheiros via Evolution API endpoint `sendMedia` (para imagens) ou `sendDocument` (para PDFs) ao WhatsApp de suporte, alem da mensagem de texto
- Atualizar o prompt do PASSO 3 para informar que o utilizador pode anexar ficheiros diretamente no chat

**7. `src/components/otto/OttoMessage.tsx`** - (Sem alteracao) Os botoes do passo 3 serao atualizados no prompt:
- `[botao:Nao, pode enviar assim]` mantem-se
- `[botao:Sim, mas nao consigo anexar aqui]` muda para `[botao:Sim, vou anexar agora]` — quando o utilizador clica, o Otto instrui a usar o botao de clip no input

### Fluxo do utilizador

```text
1. Utilizador clica "Abrir Ticket de Suporte"
2. Otto pergunta o assunto
3. Utilizador responde
4. Otto pergunta a descricao
5. Utilizador responde
6. Otto pergunta se tem anexos
   -> Utilizador clica "Sim, vou anexar agora"
   -> Otto responde: "Usa o botao de clip (📎) junto ao campo de texto para anexar os teus ficheiros. Quando estiverem prontos, escreve 'pronto' ou clica no botao abaixo."
   -> Utilizador anexa ficheiros e envia "pronto"
7. Otto mostra resumo com lista de anexos
8. Utilizador confirma -> ticket criado + ficheiros enviados por WhatsApp
```

### Detalhes tecnicos do envio WhatsApp

A Evolution API suporta o endpoint `/message/sendMedia/{instance}` que aceita:
- `number`: numero destino
- `mediatype`: "image" ou "document"  
- `media`: URL publica do ficheiro (signed URL)
- `caption`: legenda opcional

Cada anexo sera enviado como mensagem individual apos a mensagem de texto do ticket.

