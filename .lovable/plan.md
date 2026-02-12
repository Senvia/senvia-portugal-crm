

# Corrigir erro "Identifier 'apiUrl' has already been declared"

## Problema

A function `handleKeyInvoice` declara `const apiUrl` na linha 107 e depois declara novamente `const apiUrl` na linha 162. Isto causa um erro de sintaxe que impede a edge function de iniciar.

## Solucao

Remover a segunda declaracao duplicada na linha 162:

```
const apiUrl = org.keyinvoice_api_url || DEFAULT_KEYINVOICE_API_URL
```

Esta linha e identica a da linha 107 e foi adicionada acidentalmente na ultima edicao. A variavel `apiUrl` ja esta disponivel no scope da funcao, e a funcao interna `getOrCreateProduct` ja a utiliza correctamente.

## Detalhes Tecnicos

**Ficheiro:** `supabase/functions/issue-invoice/index.ts`
- Linha 162: remover `const apiUrl = org.keyinvoice_api_url || DEFAULT_KEYINVOICE_API_URL`
- Nenhuma outra alteracao necessaria

