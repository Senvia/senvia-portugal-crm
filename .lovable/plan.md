

## Fechar dialog após importação bem-sucedida

### Problema
Após importar com sucesso, o dialog mostra o resumo mas permanece aberto. O utilizador tem de fechar manualmente.

### Solução

**Ficheiro: `src/components/finance/ImportChargebacksDialog.tsx`**

No `handleImport`, após `setImportSummary(summary)` e `toast.success(...)`, adicionar `onOpenChange(false)` para fechar o dialog automaticamente. O toast já informa o utilizador do sucesso.

Remover também o bloco de UI do `importSummary` (que mostra o resumo dentro do dialog), já que o dialog fecha e o utilizador não o vê.

