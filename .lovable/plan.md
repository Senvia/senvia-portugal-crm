
# Corrigir Erros de Sincronizacao sem Integracao Configurada

## Problema
Quando o utilizador abre a pagina de Financeiro (Faturas), o sistema tenta automaticamente sincronizar faturas e notas de credito com o InvoiceXpress, mesmo que a integracao nao esteja ativada. Isto causa o erro "Sem acesso a esta organizacao" ou "Credenciais InvoiceXpress nao configuradas".

Os locais que disparam auto-sync:
- `InvoicesContent.tsx` (linha 89-94): auto-sync de faturas E notas de credito no mount
- `CreditNotesContent.tsx` (linha 47-51): auto-sync de notas de credito no mount

## Solucao
Verificar se `integrations_enabled.invoicexpress === true` na organizacao antes de disparar qualquer sincronizacao automatica. Se nao estiver ativada, nao tentar sincronizar.

## Ficheiros a Alterar

### 1. `src/components/finance/InvoicesContent.tsx`
- Obter dados da organizacao via `useOrganization()`
- Verificar `integrations_enabled.invoicexpress` antes do auto-sync
- So chamar `syncInvoices.mutate()` e `syncCreditNotes.mutate()` se InvoiceXpress estiver ativo

### 2. `src/components/finance/CreditNotesContent.tsx`
- Obter dados da organizacao via `useOrganization()`
- Verificar `integrations_enabled.invoicexpress` antes do auto-sync
- So chamar `syncCreditNotes.mutate()` se InvoiceXpress estiver ativo

### 3. `src/hooks/useCreditNotes.ts`
- No `useSyncCreditNotes`, suprimir o toast de erro quando a integracao nao esta configurada (erro 400 com mensagem "Credenciais InvoiceXpress nao configuradas")

### 4. `src/hooks/useInvoices.ts`
- No `useSyncInvoices`, mesma logica de suprimir toast para erros de credenciais nao configuradas

### Detalhe Tecnico

```text
// InvoicesContent.tsx - antes do auto-sync
import { useOrganization } from "@/hooks/useOrganization";

const { data: orgData } = useOrganization();
const isInvoicexpressEnabled = (orgData?.integrations_enabled as any)?.invoicexpress === true;

useEffect(() => {
  if (!hasSynced.current && isInvoicexpressEnabled && !syncInvoices.isPending && !syncCreditNotes.isPending) {
    hasSynced.current = true;
    syncInvoices.mutate(undefined, { onError: () => {} });
    syncCreditNotes.mutate(undefined, { onError: () => {} });
  }
}, [isInvoicexpressEnabled]);
```

A mesma logica aplica-se ao `CreditNotesContent.tsx`.

## Impacto
- Elimina erros de sincronizacao quando InvoiceXpress nao esta configurado
- Nao afecta utilizadores que tem a integracao activa
- Experiencia limpa para novas contas (sem toasts de erro)
