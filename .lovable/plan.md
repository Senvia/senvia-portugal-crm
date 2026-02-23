# Alterar Nome do Remetente para "SENVIA Software House"

## Resumo

Atualizar o nome de fallback usado nos envios de email para **"SENVIA AI Software House"** em vez de "Senvia" ou qualquer outra variante.

## Alteracoes

### 1. `supabase/functions/send-proposal-email/index.ts` (linha 192)

- Alterar o fallback do `senderName` de `"Senvia"` para `"SENVIA Software House"`
- Antes: `const senderName = orgData?.name || data.orgName || "Senvia";`
- Depois: `const senderName = orgData?.name || data.orgName || "SENVIA Software House";`

### 2. `supabase/functions/check-fidelization-alerts/index.ts` (linha 114)

- Alterar a assinatura do footer de `"Senvia OS"` para `"SENVIA Software House"`
- Antes: `Enviado por ${orgName} via Senvia OS`
- Depois: `Enviado por ${orgName} via SENVIA Software House`

### Nota

Os restantes edge functions (`send-template-email`, `send-access-email`, `send-invoice-email`) usam o nome da organizacao do cliente (`org.name`) como sender name, sem fallback "Senvia Agency". Nao precisam de alteracao -- o nome que aparece e o nome configurado pela organizacao.

### Deploy

Ambas as edge functions serao re-deployed automaticamente apos a alteracao.