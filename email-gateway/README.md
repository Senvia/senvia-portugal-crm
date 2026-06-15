# Senvia Email Gateway

Serviço Node sempre-ligado que dá às **caixas de email** do CRM uma experiência de
cliente de email completo (Entrada / Enviados / Rascunhos / Spam / Lixo / pastas),
falando **IMAP/SMTP diretamente** — sem passar pelo Chatwoot.

As caixas de **mensagens** (WhatsApp / Instagram / Messenger) continuam no Chatwoot.

## Stack (tudo MIT, sem licenças)

- [ImapFlow](https://imapflow.com) — IMAP (sync de pastas, flags, IDLE/tempo real)
- [Nodemailer](https://nodemailer.com) — envio SMTP
- [mailparser](https://nodemailer.com/extras/mailparser/) — parsing de MIME
- [@supabase/supabase-js](https://supabase.com) — escreve o email sincronizado no Postgres
- [Fastify](https://fastify.dev) — API de ações (enviar, mover, apagar, marcar…)

## Arquitetura

```
Frontend (React) ──read/realtime──> Supabase (Postgres + RLS)
       │                                  ▲
       └──action──> Edge Function ──HTTP──┤ (este gateway)
                                          │
                          ImapFlow/Nodemailer
                                          │
                                IMAP/SMTP (Zoho/Gmail/Outlook)
```

O gateway escreve o email em Postgres (service role); o frontend lê via Supabase
com RLS e recebe atualizações em tempo real. As ações do frontend chegam aqui via
uma Edge Function que assina os pedidos com `GATEWAY_SHARED_SECRET`.

## Desenvolvimento

```bash
cd email-gateway
npm install
cp .env.example .env     # preencher TEST_IMAP_PASSWORD (app-password Zoho)
npm run test:connect     # prova de conectividade (lista pastas + últimas mensagens)
```

## Deploy (servidor do Chatwoot)

Containerizado (Dockerfile a adicionar na Fase 5). Corre como mais um serviço
Docker na mesma máquina do Chatwoot. Custo extra de infra: 0 €.
