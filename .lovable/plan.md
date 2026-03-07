

## Email de Novo Lead: Sempre via Brevo da SENVIA

### Problema atual
O bloco de email (linhas 462-536) usa `org.brevo_api_key` e `org.brevo_sender_email` — ou seja, depende de cada organizacao ter Brevo configurado. Se nao tiver, nao envia nada.

### Solucao
Usar **sempre** a chave Brevo global da SENVIA (secret `BREVO_API_KEY`) e um remetente fixo da SENVIA, independentemente da configuracao do cliente. O email tera branding SENVIA.

### Alteracoes — 1 ficheiro

**`supabase/functions/submit-lead/index.ts`** (linhas 462-536)

Substituir o bloco inteiro de email notification por:

1. **Chave Brevo**: `Deno.env.get('BREVO_API_KEY')` (secret global, ja existe)
2. **Remetente fixo**: `{ email: 'notificacoes@senvia.pt', name: 'Senvia OS' }` (ou o email verificado na conta Brevo da SENVIA)
3. **Destinatarios**: Manter a logica atual — admins da org + comercial atribuido
4. **Layout SENVIA**: HTML com branding escuro, logo Senvia, dados do lead e botao CTA para o CRM
5. **Sem dependencia do Brevo do cliente**: Remove a verificacao `if (brevoKey && brevoSender)` — envia sempre

### Layout do email (HTML)

```text
┌──────────────────────────────────┐
│  [Logo Senvia]                   │
│                                  │
│  🚀 Novo Lead Recebido          │
│  Organização: {org.name}         │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Nome:      João Silva      │  │
│  │ Telefone:  912345678       │  │
│  │ Email:     joao@email.com  │  │
│  │ Fonte:     Landing Page    │  │
│  │ Formulário: Form X        │  │
│  │ Empresa:   XPTO Lda       │  │
│  └────────────────────────────┘  │
│                                  │
│  [ Ver Lead no Senvia ]  (CTA)   │
│                                  │
│  ─────────────────────────────   │
│  Senvia OS · senvia.pt           │
└──────────────────────────────────┘
```

- Fundo escuro (#0f172a), texto branco, botao verde (#10b981)
- Logo Senvia via URL publica do projeto
- Link CTA aponta para `https://senvia-portugal-crm.lovable.app/leads`

### Resumo
1 ficheiro editado. O email de novo lead passa a ser sempre enviado pela conta Brevo da SENVIA com layout profissional, sem depender da configuracao Brevo de cada cliente.

