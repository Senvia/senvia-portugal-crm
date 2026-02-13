
# Mitigar Falsos Positivos de Abertura de Email

## Status: ✅ Implementado

## Threshold: 120 segundos

Aberturas registadas em menos de 120 segundos apos o envio sao consideradas falsos positivos (pre-fetch do Gmail/Outlook) e sao ignoradas.

### Ficheiros alterados
- `supabase/functions/sync-campaign-sends/index.ts` — threshold 120s no bloco `opened/unique_opened`
- `supabase/functions/brevo-webhook/index.ts` — threshold 120s no case `opened`
- Migracao SQL executada — limpou `opened_at` existentes com delay < 120s
