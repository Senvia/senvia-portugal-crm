

## Bug: "Nome da Empresa" obrigatório mesmo quando desactivado nas definições

### Causa

Em `src/components/leads/AddLeadModal.tsx`, linha 69-70, existe uma regra hardcoded que força `company_name` como obrigatório quando o nicho da organização é `telecom` — ignorando completamente as definições de campos configuradas pelo administrador.

```typescript
// Linha 69-70 — o problema
if (key === 'company_name' && isTelecom) {
  return z.string().min(minLen, ...); // SEMPRE obrigatório, ignora settings
}
```

### Correção

Remover este override hardcoded. A função `strField` já respeita as definições de campos na linha 72 — basta deixar essa lógica funcionar normalmente para todos os nichos, incluindo telecom.

**Ficheiro:** `src/components/leads/AddLeadModal.tsx`
- Remover as linhas 69-71 (o bloco `if (key === 'company_name' && isTelecom)`)
- A validação passará a seguir exclusivamente o que está configurado nas definições de campos

### Impacto
- Zero risco — apenas remove uma excepção hardcoded, permitindo que as definições do administrador sejam respeitadas
- Se o admin quiser `company_name` obrigatório, basta activá-lo nas definições

