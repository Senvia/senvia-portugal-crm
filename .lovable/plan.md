

# Diagnosticar e corrigir emissao de fatura KeyInvoice

## Problema

Os logs mostram que:
1. O produto foi criado com sucesso (`insertProduct` retornou `Status:1`)
2. O `insertDocument` foi chamado, mas **nao ha log da resposta** - nao sabemos o que a API devolveu
3. O PDF falhou com `Failed to decode base64` - indica que a resposta do `getDocumentPDF` nao e base64 puro (pode estar dentro de um objeto)
4. O sistema reportou sucesso ao utilizador, mas a fatura pode nao ter sido criada no KeyInvoice

## Solucao

### Passo 1: Adicionar log completo da resposta do insertDocument

**Ficheiro:** `supabase/functions/issue-invoice/index.ts` (linha 338)

Adicionar um `console.log` imediatamente apos o `createRes.json()` para ver a resposta completa:

```typescript
const createData = await createRes.json()
console.log('KeyInvoice insertDocument FULL response:', JSON.stringify(createData).substring(0, 2000))
```

Isto vai permitir ver nos logs o que a API realmente devolveu.

### Passo 2: Corrigir o parsing do PDF

**Ficheiro:** `supabase/functions/issue-invoice/index.ts` (linhas 370-374)

O `getDocumentPDF` provavelmente retorna o base64 dentro de `pdfData.Data.PDF` ou `pdfData.Data.Content` em vez de `pdfData.Data` diretamente. Corrigir para tentar multiplos caminhos:

```typescript
if (pdfData.Status === 1 && pdfData.Data) {
  console.log('KeyInvoice getDocumentPDF Data type:', typeof pdfData.Data, 
    typeof pdfData.Data === 'object' ? Object.keys(pdfData.Data).join(',') : 'string')
  
  // Try multiple paths for the base64 content
  let base64Pdf = typeof pdfData.Data === 'string' 
    ? pdfData.Data 
    : (pdfData.Data.PDF || pdfData.Data.Content || pdfData.Data.File || '')
  
  if (base64Pdf) {
    // Remove potential data:application/pdf;base64, prefix
    base64Pdf = base64Pdf.replace(/^data:[^;]+;base64,/, '')
    const binaryStr = atob(base64Pdf)
    // ... rest of PDF handling
  }
}
```

### Passo 3: Logar tambem o payload completo do insertDocument

Adicionar log do payload completo (nao so as keys) para debug:

```typescript
console.log('KeyInvoice insertDocument FULL payload:', JSON.stringify(insertPayload))
```

### Resultado esperado

Apos o deploy, quando o utilizador emitir uma fatura:
1. Os logs vao mostrar a resposta completa do `insertDocument` - sabemos se a fatura foi criada
2. Os logs vao mostrar a estrutura do PDF - podemos corrigir o parsing
3. Se a fatura nao estiver a ser criada, o erro real sera visivel nos logs para corrigir

