
# Recuperar Dados da Campanha e Activar Tracking em Tempo Real

## Problema Actual

A campanha "Apoio Portugal 01" enviou 128 emails com sucesso via Brevo, mas **zero registos** ficaram guardados na base de dados porque o bug do FK constraint impediu todos os INSERTs. Os dados na Brevo existem, mas nao temos forma de os mostrar.

Alem disso, mesmo que o webhook da Brevo (`brevo-webhook`) esteja configurado, ele so actualiza registos que **ja existam** na tabela `email_sends`. Sem registos, nao ha nada para actualizar.

## Solucao (3 partes)

### Parte 1: Edge Function para Backfill via API da Brevo

Criar uma nova Edge Function `sync-campaign-sends` que:
1. Recebe o `campaignId` e `organizationId`
2. Busca o `brevo_api_key` da organizacao
3. Chama a API da Brevo (`GET /v3/smtp/emails?messageId=...` ou `GET /v3/transactional/emails`) para obter o historico de emails transaccionais enviados
4. Para cada email encontrado, cria o registo em `email_sends` com o `campaign_id`, `brevo_message_id`, status, `opened_at`, `clicked_at`, etc.
5. Isto permite recuperar os dados da campanha que foram perdidos

A API da Brevo disponibiliza:
- `GET /v3/smtp/statistics/events` - eventos recentes (delivered, opened, clicked, etc.)
- Filtravel por `tag` ou intervalo de datas
- Retorna `messageId`, `email`, `event`, `date`

### Parte 2: Melhorar o Webhook Brevo (ja existe)

O webhook actual (`brevo-webhook`) ja esta correcto - actualiza registos existentes pelo `brevo_message_id`. Com a Parte 1 a popular os registos, o webhook passara a funcionar automaticamente para updates futuros.

### Parte 3: Realtime no Modal de Detalhes

Adicionar `refetchInterval` ao `useCampaignSends` para polling automatico (a cada 10 segundos) quando o modal esta aberto, garantindo que as metricas se actualizam sem precisar de fechar e abrir.

Opcionalmente, activar Supabase Realtime na tabela `email_sends` para updates instantaneos.

## Ficheiros a criar/editar

1. **CRIAR `supabase/functions/sync-campaign-sends/index.ts`**
   - Edge Function que chama a API da Brevo para buscar eventos de email
   - Filtra por datas da campanha e insere/actualiza registos em `email_sends`

2. **EDITAR `src/hooks/useCampaigns.ts`**
   - Adicionar `refetchInterval: 10000` ao `useCampaignSends` para polling automatico
   - Criar hook `useSyncCampaignSends` para chamar a Edge Function de backfill

3. **EDITAR `src/components/marketing/CampaignDetailsModal.tsx`**
   - Adicionar botao "Sincronizar" que chama a Edge Function de backfill
   - Mostrar indicador de "a actualizar..." durante o polling

4. **Migracao SQL**
   - Activar Realtime na tabela `email_sends` (opcional, polling pode ser suficiente)

## Detalhe Tecnico: API Brevo para Backfill

```text
GET https://api.brevo.com/v3/smtp/statistics/events
Headers: api-key: {brevo_api_key}
Query params:
  - startDate: data da campanha (sent_at)
  - endDate: agora
  - limit: 500
  - offset: 0
  - tags: campaign_{campaignId} (se usarmos tags)

Resposta:
{
  "events": [
    {
      "email": "user@example.com",
      "date": "2026-02-13T17:09:37Z",
      "messageId": "<abc123@brevo>",
      "event": "delivered" | "opened" | "click" | ...
      "subject": "..."
    }
  ]
}
```

Para cada evento, fazer upsert no `email_sends` usando o `brevo_message_id` como chave.

## Resultado Esperado

- Ao clicar "Sincronizar" na campanha, os dados sao recuperados da API da Brevo
- Metricas (Enviados, Aberturas, Cliques, Erros) ficam correctas
- Lista de destinatarios aparece com os estados correctos
- Updates futuros do webhook funcionam automaticamente
- Modal actualiza a cada 10 segundos enquanto esta aberto
