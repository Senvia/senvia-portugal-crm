
# Reescrita da Integração KeyInvoice -- API Correta

## Contexto

A implementação atual do KeyInvoice utiliza endpoints REST inventados (`/auth/login/`, `/documents/new/`, `/documents/{id}/finalize/`, etc.) que **nao existem na API real**. A API KeyInvoice real funciona de forma completamente diferente:

- **Endpoint unico**: POST para o endpoint base da API
- **Metodo no body**: `{"method":"insertDocument",...}`  
- **Autenticacao**: Header `Sid` com o identificador de sessao (nao `Authorization: Token`)
- **Login**: `{"method":"login","username":"...","password":"..."}`

## O que muda

### 1. Reescrever `keyinvoice-auth` (Edge Function)

Corrigir o login para usar a API real:
- Endpoint: POST para URL base da API (o endpoint exato do KeyInvoice, ex: `https://app.keyinvoice.com/API/`)
- Body: `{"method":"login","username":"...","password":"...","companyCode":"..."}`
- Resposta: `{Status:1,Data:{Sid:"..."}}` -- o `Sid` e o token de sessao
- Guardar `Sid` como `keyinvoice_token` na BD
- **Nota**: O endpoint base deve ser configuravel na organizacao (novo campo `keyinvoice_api_url`)

### 2. Reescrever `issue-invoice` -- bloco KeyInvoice

Substituir a logica de criacao de documento:
- Usar `method: "insertDocument"` com `DocType: "34"` (Fatura-Recibo) ou `DocType: "4"` (Fatura)
- Header: `Sid: <token>` em vez de `Authorization: Token`
- Body inclui `IdClient`, `DocLines` com `IdProduct`, `Qty`, `Price`, `IdTax`
- Resposta: `{Status:1,Data:{DocType,DocSeries,DocNum,FullDocNumber}}`
- Guardar `DocNum` + `FullDocNumber` como referencia
- Obter PDF via `method: "getDocumentPDF"` (retorna Base64, converter e guardar no Storage)

### 3. Reescrever `cancel-invoice` -- bloco KeyInvoice

Substituir anulacao:
- Usar `method: "setDocumentVoid"` com `DocType`, `DocNum`, `CreditReason`
- Se documento tem mais de 5 dias, a API emite nota de credito automaticamente
- Resposta pode ser `{Voided,...}` ou `{DocType,DocSeries,DocNum,...}` (nota de credito)

### 4. Reescrever `send-invoice-email` -- bloco KeyInvoice

Substituir envio de email:
- Usar `method: "sendDocumentPDF2Email"` com `DocType`, `DocNum`, `EmailDestinations`, `EmailSubject`, `EmailBody`

### 5. Adicionar campo `keyinvoice_api_url` a tabela `organizations`

A documentacao usa "ENDERECO_API" como URL base -- cada conta KeyInvoice pode ter URL diferente. Adicionar:
- Nova coluna `keyinvoice_api_url` (text, nullable)
- Valor por defeito: `https://app.keyinvoice.com/API/` (a confirmar)
- Campo editavel nas Definicoes -> Integracoes -> KeyInvoice

### 6. Atualizar UI nas Definicoes

Adicionar campo "URL da API" no accordion do KeyInvoice para que o utilizador possa configurar o endpoint.

## Detalhes Tecnicos

### Arquitetura da chamada KeyInvoice (padrao para todas as funcoes)

```text
POST {keyinvoice_api_url}
Headers:
  Sid: {token_sessao}
  Content-Type: application/json
Body:
  {"method":"insertDocument","DocType":"34","IdClient":"C001","DocLines":[...]}
Resposta:
  {"Status":1,"Data":{"DocType":"34","DocSeries":"1","DocNum":"101","FullDocNumber":"FR 1/101"}}
```

### Mapeamento de tipos de documento

```text
4  = Fatura (FT)
7  = Nota de Credito (NC)
32 = Fatura Simplificada (FS)
34 = Fatura-Recibo (FR)
```

### Helper de autenticacao reutilizavel

Criar funcao helper `getKeyInvoiceSid()` que:
1. Verifica token em cache na BD
2. Se expirado, faz `method: "login"` para obter novo `Sid`
3. Guarda novo `Sid` com expiracao de 23h
4. Retorna `Sid` pronto a usar

### Fluxo de emissao de fatura (corrigido)

```text
1. getKeyInvoiceSid() -> Sid
2. method: "insertDocument" (DocType=34, IdClient, DocLines) -> DocNum, FullDocNumber
3. method: "getDocumentPDF" (DocType=34, DocNum) -> Base64
4. Converter Base64 -> Buffer -> Upload Supabase Storage
5. Guardar referencia na tabela sales
```

### Ficheiros a modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/keyinvoice-auth/index.ts` | Reescrever login para usar `method:"login"` + `Sid` |
| `supabase/functions/issue-invoice/index.ts` | Reescrever `handleKeyInvoice()` + `getKeyInvoiceToken()` |
| `supabase/functions/cancel-invoice/index.ts` | Reescrever bloco KeyInvoice para `method:"setDocumentVoid"` |
| `supabase/functions/send-invoice-email/index.ts` | Reescrever bloco KeyInvoice para `method:"sendDocumentPDF2Email"` |
| `src/components/settings/IntegrationsContent.tsx` | Adicionar campo URL da API |
| `src/pages/Settings.tsx` | Adicionar estado + handler para `keyinvoice_api_url` |
| **Migracao BD** | Adicionar coluna `keyinvoice_api_url` a `organizations` |

### Questao em aberto

O endpoint base da API KeyInvoice (ex: `https://app.keyinvoice.com/API/`) -- precisas de confirmar qual e o URL exato que utilizas. Se for sempre o mesmo para todos os clientes, posso usar um valor fixo em vez de campo configuravel.
