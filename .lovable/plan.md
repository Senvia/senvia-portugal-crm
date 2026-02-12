

# Corrigir Autenticacao KeyInvoice: method "authenticate" com header "Apikey"

## Problema Confirmado

A documentacao oficial do KeyInvoice confirma que o fluxo correto e:

1. Chamar `method: "authenticate"` com header `Apikey: CHAVE_API` para obter um `Sid` de sessao (TTL 3600 segundos)
2. Usar esse `Sid` no header `Sid` para todas as chamadas subsequentes

O codigo atual envia a chave da API diretamente no header `Sid`, o que causa `Status: 0` porque o servidor espera um identificador de sessao temporario, nao a chave permanente.

## Plano de Implementacao

### Passo 1 - Testar o metodo "authenticate" (Edge Function temporaria)

Atualizar `keyinvoice-test` para chamar:
```text
POST https://login.keyinvoice.com/API5.php
Header: Apikey: 169137nd0pd56fa02d61291072f74e30997a158d31
Header: Content-Type: application/json
Body: {"method":"authenticate"}
```
Resposta esperada: `{Status:1, Sid: "IDENTIFICADOR_SESSAO"}`

Se funcionar, usar o Sid retornado para testar `getDocTypes` e `verifyUserInsertionPricesWithVAT`.

### Passo 2 - Criar funcao de autenticacao reutilizavel

Atualizar `keyinvoice-auth/index.ts` para:
- Chamar `method: "authenticate"` com header `Apikey`
- Guardar o Sid retornado na tabela `organizations` (campos `keyinvoice_sid` e `keyinvoice_sid_expires_at`)
- Reutilizar o Sid se ainda for valido (dentro dos 3600s, com margem de 300s)
- Retornar o Sid ao chamador

### Passo 3 - Migracao SQL

Adicionar dois campos a tabela `organizations`:
- `keyinvoice_sid` (text, nullable) - Sid de sessao atual
- `keyinvoice_sid_expires_at` (timestamptz, nullable) - quando expira

### Passo 4 - Atualizar todas as Edge Functions KeyInvoice

Em cada funcao, substituir o padrao antigo:
```text
ANTES: const sid = getKeyInvoiceApiKey(org)  --> usa chave como Sid
DEPOIS: const sid = await getKeyInvoiceSid(supabase, org, orgId)  --> faz authenticate se necessario
```

Funcoes a atualizar:

| Ficheiro | Localizacao do codigo a alterar |
|----------|-------------------------------|
| `issue-invoice/index.ts` | Funcao `handleKeyInvoice` (linha 68) + headers das chamadas (linhas 97, 130, 147) |
| `cancel-invoice/index.ts` | Linha 94 + header na chamada `setDocumentVoid` (linha 106) |
| `send-invoice-email/index.ts` | Linha 99 + header na chamada `sendDocumentPDF2Email` (linha 113) |
| `keyinvoice-auth/index.ts` | Reescrever completamente - passa a fazer authenticate real com cache |

A funcao `getKeyInvoiceSid` reutilizavel sera incluida em cada ficheiro (pois edge functions nao partilham imports):

```text
async function getKeyInvoiceSid(supabase, org, orgId):
  1. Verificar se org.keyinvoice_sid existe e org.keyinvoice_sid_expires_at > agora + 5min
  2. Se sim, retornar org.keyinvoice_sid (cache valido)
  3. Se nao, chamar POST API5.php com:
     - Header: Apikey = org.keyinvoice_password
     - Body: {method: "authenticate"}
  4. Extrair Sid da resposta
  5. Guardar na tabela organizations: keyinvoice_sid + keyinvoice_sid_expires_at (agora + 3600s)
  6. Retornar Sid
```

### Passo 5 - Testar e limpar

- Chamar `keyinvoice-test` para validar o fluxo completo
- Remover a edge function de teste
- Validar emissao de fatura na conta DEMO

## Resumo das Alteracoes

| Tipo | Detalhe |
|------|---------|
| Migracao SQL | Adicionar `keyinvoice_sid` e `keyinvoice_sid_expires_at` a `organizations` |
| Edge Function | `keyinvoice-test/index.ts` - teste temporario |
| Edge Function | `keyinvoice-auth/index.ts` - reescrever com authenticate real |
| Edge Function | `issue-invoice/index.ts` - usar authenticate com cache |
| Edge Function | `cancel-invoice/index.ts` - usar authenticate com cache |
| Edge Function | `send-invoice-email/index.ts` - usar authenticate com cache |

