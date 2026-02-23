

# Correcao dos Relatorios de Email - Webhook Brevo

## Problema Identificado

O email de automacao foi enviado com sucesso (esta na base de dados com `status: "sent"`), mas os eventos de entrega e abertura do Brevo **nunca chegaram** ao sistema. O webhook `brevo-webhook` nao tem nenhum log -- zero chamadas recebidas.

Isto significa que o Brevo nao esta a enviar os webhooks para o URL correto, OU o URL nao esta configurado no painel do Brevo.

## O que Precisa Ser Feito

### 1. Configuracao do Webhook no Brevo (Acao Manual Necessaria)

No painel do Brevo (app.brevo.com), e preciso configurar o webhook URL:

```text
URL: https://zppcobirzgpfcrnxznwe.supabase.co/functions/v1/brevo-webhook
```

Eventos a ativar:
- delivered
- opened / unique_opened
- click
- hard_bounce / soft_bounce
- blocked
- spam
- unsubscribed

### 2. Correcao no Codigo - Fallback para Status "sent"

Atualmente, se o status do email e apenas `"sent"` (sem webhook de entrega), o sistema conta-o como "enviado" mas nao como "entregue". Isto esta tecnicamente correto, mas causa confusao.

**Alteracao proposta**: Na contagem de "Enviados", ja inclui todos os status validos. Nenhuma mudanca necessaria na logica de contagem -- o problema e 100% o webhook nao estar configurado.

### 3. Verificacao Rapida (Codigo)

Vou adicionar um aviso visual na pagina de Relatorios quando o webhook parece nao estar a funcionar (ex: todos os emails com status "sent" e zero "delivered" sugere que o webhook nao esta configurado).

### Alteracoes Tecnicas

**Ficheiro: `src/pages/marketing/Reports.tsx`**
- Adicionar um alerta/banner quando `stats.sent > 0 && stats.delivered === 0` avisando que o tracking de entregas/aberturas pode nao estar configurado

**Ficheiro: `src/components/settings/IntegrationsContent.tsx`** (se existir secao Brevo)
- Mostrar o URL do webhook para facil copia

### Resumo

O sistema esta a funcionar corretamente -- o Brevo e que nao esta a enviar os eventos de volta. A solucao principal e configurar o webhook no painel do Brevo. A alteracao no codigo e apenas um aviso amigavel para o utilizador.
