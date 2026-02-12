

# Corrigir Autenticação KeyInvoice API 5.0

## Problema Identificado

O codigo atual envia a chave da API diretamente no header `Sid`, mas a API 5.0 do KeyInvoice provavelmente requer um fluxo de autenticacao em 2 passos:

1. **Passo 1**: Chamar o metodo `login` com a chave da API para obter um `Sid` de sessao
2. **Passo 2**: Usar esse `Sid` de sessao (temporario) em todas as chamadas subsequentes

O erro `{"Status": 0}` acontece porque o servidor espera um Sid de sessao valido, nao a chave da API diretamente.

## Plano de Implementacao

### Fase 1 - Criar Edge Function de Teste

Criar uma edge function temporaria `keyinvoice-test` que testa diferentes formatos de login:

- **Teste A**: `method: "login"` com a chave no campo `ApiKey`
- **Teste B**: `method: "login"` com a chave no campo `Key`  
- **Teste C**: `method: "login"` com a chave no campo `Token`
- **Teste D**: `method: "login"` com a chave no campo `Sid` dentro do body (nao no header)

Cada teste envia um POST para `https://login.keyinvoice.com/API5.php` e regista a resposta.

### Fase 2 - Atualizar Logica de Autenticacao

Quando identificarmos o formato correto do `login`, atualizar todas as edge functions que usam o KeyInvoice:

1. `supabase/functions/issue-invoice/index.ts` - funcao `getKeyInvoiceApiKey` e `handleKeyInvoice`
2. `supabase/functions/cancel-invoice/index.ts` - funcao `getKeyInvoiceApiKey`
3. `supabase/functions/send-invoice-email/index.ts` - funcao `getKeyInvoiceApiKey`
4. `supabase/functions/issue-invoice-receipt/index.ts` (se existir logica KeyInvoice)
5. `supabase/functions/generate-receipt/index.ts` (se existir logica KeyInvoice)
6. `supabase/functions/keyinvoice-auth/index.ts`

A logica sera:
- Chamar `login` com a chave da API
- Receber o `Sid` de sessao
- Guardar o Sid em cache na tabela `organizations` (campo existente ou novo campo `keyinvoice_sid` + `keyinvoice_sid_expires_at`)
- Reutilizar o Sid enquanto nao expirar (23h segundo a documentacao)

### Fase 3 - Limpar e Validar

- Remover a edge function de teste
- Testar a emissao de uma fatura real na conta DEMO

## Detalhes Tecnicos

```text
Fluxo Atual (Incorreto):
  Chave API --> Header Sid --> API5.php --> Status: 0 (Rejeitado)

Fluxo Correto (Proposto):
  Chave API --> POST login --> Sid Sessao --> Header Sid --> API5.php --> Status: 1 (OK)
```

### Ficheiros a Modificar

| Ficheiro | Alteracao |
|----------|-----------|
| `supabase/functions/keyinvoice-test/index.ts` | Criar (temporario) - testar formatos de login |
| `supabase/functions/issue-invoice/index.ts` | Atualizar autenticacao com fluxo login |
| `supabase/functions/cancel-invoice/index.ts` | Atualizar autenticacao com fluxo login |
| `supabase/functions/send-invoice-email/index.ts` | Atualizar autenticacao com fluxo login |
| `supabase/functions/keyinvoice-auth/index.ts` | Atualizar para fazer login real |
| Migracao SQL (se necessario) | Adicionar campos `keyinvoice_sid` e `keyinvoice_sid_expires_at` |

### Riscos e Mitigacoes

- **Risco**: A conta DEMO pode ter limitacoes na API. **Mitigacao**: O teste de login vai confirmar se funciona.
- **Risco**: O formato exato do `login` e desconhecido. **Mitigacao**: Testamos multiplos formatos em paralelo.
- **Risco**: O Sid pode expirar durante operacoes. **Mitigacao**: Cache com margem de seguranca (22h em vez de 23h).

