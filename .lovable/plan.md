
# Corrigir Integração KeyInvoice para API 5.0

## O Problema

A implementação atual pede **username, password e código de empresa** para autenticar com o KeyInvoice. Mas conforme o print do painel KeyInvoice, a **API 5.0** usa:
- Uma **Chave (API Key)** direta -- sem login com email/password
- URL: `https://login.keyinvoice.com/API5.php` (nao `https://app.keyinvoice.com/API/`)
- Texto "CloudInvoice" esta desatualizado

## O que muda

### 1. Simplificar autenticacao (sem login)

Na API 5.0, a Chave e usada diretamente no header `Sid` -- nao e preciso chamar `method:"login"`. Isto elimina:
- Campo username
- Campo password
- Campo codigo da empresa
- Toda a logica de login e cache de token

### 2. UI nas Definicoes -- Integracoes

Substituir os 3 campos (email, password, codigo empresa) por **1 unico campo**:
- **"Chave da API"** (campo com show/hide, tipo password)
- Atualizar placeholder do URL da API para `https://login.keyinvoice.com/API5.php`
- Remover todas as referencias a "CloudInvoice"
- Atualizar badge para verificar apenas se a Chave esta preenchida

### 3. Edge Functions

Todos os blocos KeyInvoice serao simplificados:
- **Sem login** -- a Chave e usada diretamente como `Sid` no header
- **Sem cache de token** -- nao e necessario, a chave e permanente
- URL por defeito: `https://login.keyinvoice.com/API5.php`

Funcoes afetadas:
- `keyinvoice-auth` -- pode ser simplificada ou removida (a chave e a propria autenticacao)
- `issue-invoice` -- `getKeyInvoiceSid()` passa a retornar a chave diretamente
- `cancel-invoice` -- mesma simplificacao
- `send-invoice-email` -- mesma simplificacao

### 4. Base de dados

A coluna `keyinvoice_username` sera reutilizada internamente ou adicionamos coluna nova. Os campos `keyinvoice_password` e `keyinvoice_company_code` deixam de ser usados. Vamos guardar a Chave no campo existente `keyinvoice_password` (por seguranca, ja que e um campo existente) OU criar campo `keyinvoice_api_key_value` dedicado.

Opcao mais limpa: reutilizar `keyinvoice_password` para guardar a Chave (evita migracao), ja que username e company_code deixam de ser necessarios.

## Detalhes Tecnicos

### Padrao de chamada simplificado (API 5.0)

```text
POST https://login.keyinvoice.com/API5.php
Headers:
  Sid: {CHAVE_API}
  Content-Type: application/json
Body:
  {"method":"insertDocument","DocType":"34","IdClient":"C001","DocLines":[...]}
```

### Ficheiros a modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/keyinvoice-auth/index.ts` | Simplificar: retorna a chave diretamente (sem login) |
| `supabase/functions/issue-invoice/index.ts` | `getKeyInvoiceSid()` retorna a chave, URL default atualizado |
| `supabase/functions/cancel-invoice/index.ts` | Mesma simplificacao |
| `supabase/functions/send-invoice-email/index.ts` | Mesma simplificacao |
| `src/components/settings/IntegrationsContent.tsx` | Substituir 3 campos por 1 (Chave API), remover CloudInvoice |
| `src/pages/Settings.tsx` | Remover estados username/companyCode, adaptar para chave unica |
| `src/components/sales/SaleFiscalInfo.tsx` | Atualizar verificacao de credenciais |

### Nao requer migracao BD

Vamos reutilizar a coluna `keyinvoice_password` para guardar a Chave da API (e a coluna mais segura por ser tratada como campo sensivel). Os campos `keyinvoice_username` e `keyinvoice_company_code` simplesmente deixam de ser usados.
