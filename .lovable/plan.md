

## Auditoria de Bugs no Módulo de Leads

Analisei o código e encontrei **3 problemas** a corrigir:

### Bug 1: `labelText` ainda força asterisco para `company_name` em telecom
Na linha 157-158 de `AddLeadModal.tsx`, o helper `labelText` ainda tem lógica hardcoded que mostra asterisco (`*`) no campo "Nome da Empresa" para nichos telecom, mesmo que o schema já não force o campo como obrigatório (removemos isso na correção anterior). Isto confunde o utilizador -- vê asterisco mas o campo não é obrigatório.

**Correção:** Remover a variável `forced` e usar apenas `isRequired(key)`.

### Bug 2: `AlertDialogFooter` não aceita refs (warning na consola)
O `AlertDialogFooter` em `alert-dialog.tsx` (linha 51) é um function component simples sem `forwardRef`. Quando o Radix tenta passar uma ref, gera o warning na consola. É usado no `LeadDetailsModal` (confirmação de eliminar lead).

**Correção:** Converter `AlertDialogFooter` para usar `React.forwardRef`, igual ao `AlertDialogHeader` (que já tem o mesmo padrão simples mas neste caso não recebe refs). O `DialogHeader` e `DialogFooter` já foram corrigidos anteriormente com `forwardRef`.

### Bug 3: `AlertDialogHeader` tem o mesmo problema
Na linha 45-49, `AlertDialogHeader` também é function component sem `forwardRef`.

**Correção:** Converter ambos para `forwardRef`.

---

### Ficheiros a editar

1. **`src/components/leads/AddLeadModal.tsx`** -- Remover `forced` do `labelText` (linhas 157-158)
2. **`src/components/ui/alert-dialog.tsx`** -- Converter `AlertDialogHeader` e `AlertDialogFooter` para `forwardRef` (linhas 45-54)

### Impacto
- Remove asterisco enganoso no campo "Nome da Empresa"
- Elimina warning de consola sobre refs em `LeadDetailsModal`
- Zero risco de quebrar funcionalidade

