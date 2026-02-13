
# Mitigar Falsos Positivos de Abertura de Email

## Contexto do Problema

Clientes de email como o Gmail fazem **pre-fetch automatico** das imagens dos emails para seguranca. Como o tracking de aberturas da Brevo funciona com um pixel (imagem invisivel), o Gmail carrega esse pixel antes do utilizador abrir o email. A Brevo regista isso como evento `opened`, gerando falsos positivos.

Exemplo real: `geral.senvia@gmail.com` foi marcado como "aberto" 6 segundos apos o envio — claramente um pre-fetch automatico, nao uma abertura real.

## Solucao: Filtro de Aberturas Suspeitas

### 1. Edge Function `sync-campaign-sends` — Marcar aberturas suspeitas

Ao processar eventos da Brevo, se o `opened_at` ocorrer menos de 10 segundos apos o `sent_at`, considerar como abertura suspeita e **nao registar** o `opened_at`.

Logica no bloco de processamento de eventos:
- Quando o evento e `opened` ou `unique_opened`, verificar a diferenca entre a data do evento e o `sentAt` do registo
- Se a diferenca for inferior a 10 segundos, ignorar o evento de abertura
- Caso contrario, registar normalmente

### 2. Edge Function `brevo-webhook` — Mesmo filtro no webhook

Quando o webhook recebe um evento `opened`:
- Buscar o registo correspondente pelo `brevo_message_id`
- Verificar se `sent_at` existe e se a diferenca para `now()` e inferior a 10 segundos
- Se sim, ignorar o evento

### 3. Limpeza dos dados actuais

Correr um UPDATE para limpar os `opened_at` dos registos que foram marcados como abertos em menos de 10 segundos apos o envio:

```sql
UPDATE email_sends
SET opened_at = NULL
WHERE opened_at IS NOT NULL
  AND sent_at IS NOT NULL
  AND EXTRACT(EPOCH FROM (opened_at - sent_at)) < 10;
```

### Ficheiros a alterar

- `supabase/functions/sync-campaign-sends/index.ts` — adicionar verificacao de tempo no bloco `opened/unique_opened`
- `supabase/functions/brevo-webhook/index.ts` — adicionar verificacao de tempo no case `opened`
- Migracao SQL — limpar falsos positivos existentes

### Resultado

- Aberturas reais (utilizador clicou e leu o email) serao contadas correctamente
- Pre-fetches automaticos do Gmail/Outlook serao ignorados
- As metricas de "Aberturas" passam a ser mais fieis a realidade
