
# Corrigir Sync de Campanhas - Data Invalida

## Problema

A Edge Function `sync-campaign-sends` nao esta a recuperar dados da Brevo porque envia uma data futura como `endDate`. O erro nos logs:

```
Brevo API error: 400 {"code":"invalid_parameter","message":"End date should not be greater than current date"}
```

A linha problemática (linha 75 do ficheiro):
```javascript
const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
```

Isto calcula a data de amanha, que a Brevo rejeita.

## Solucao

### Ficheiro: `supabase/functions/sync-campaign-sends/index.ts`

Alterar o calculo do `endDate` para usar a data de **hoje** em vez de amanha:

```javascript
const endDate = new Date().toISOString().split("T")[0];
```

Isto e a unica alteracao necessaria. Uma vez corrigido:
- O auto-sync que ja esta implementado no modal vai funcionar
- Os dados da campanha "Apoio Portugal 01" vao ser recuperados automaticamente da Brevo
- O polling de 10 segundos vai manter tudo actualizado
