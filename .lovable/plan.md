

# Remover coluna "Associada" e corrigir erro de sincronizacao

## Alteracoes

### 1. `src/components/finance/InvoicesContent.tsx`

**Remover coluna "Associada":**
- Remover o `<TableHead>` "Associada" (linha 339)
- Remover o `<TableCell>` correspondente com os icones CheckCircle2/AlertCircle (linhas 386-391)
- Remover imports nao utilizados (`CheckCircle2`, `AlertCircle`) se deixarem de ser usados

**Corrigir erro de sincronizacao:**
- No `useEffect` de auto-sync (linhas 89-95), envolver as chamadas `mutate()` com callbacks silenciosos para nao mostrar toast de erro durante a sincronizacao automatica em background
- Substituir `syncInvoices.mutate()` e `syncCreditNotes.mutate()` por versoes com `onError` vazio, para que falhas silenciosas nao perturbem o utilizador:

```typescript
useEffect(() => {
  if (!hasSynced.current && !syncInvoices.isPending && !syncCreditNotes.isPending) {
    hasSynced.current = true;
    syncInvoices.mutate(undefined, { onError: () => {} });
    syncCreditNotes.mutate(undefined, { onError: () => {} });
  }
}, []);
```

Isto garante que a sincronizacao automatica em background nunca mostra erros ao utilizador. Se o utilizador disparar manualmente (caso exista botao), o toast de erro continua a funcionar normalmente.

### Ficheiros a alterar
- `src/components/finance/InvoicesContent.tsx` - remover coluna + silenciar auto-sync

