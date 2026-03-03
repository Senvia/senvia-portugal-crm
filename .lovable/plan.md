

## Bug: "Nome da Empresa" da Lead vai para o campo "Nome" do Cliente

### Causa raiz

No ficheiro `src/pages/Leads.tsx` (linhas 276-283), quando uma lead é movida para a etapa "Ganha" e o cliente é criado automaticamente, o código passa:

```typescript
convertLeadToClient.mutate({
  lead_id: leadId,
  name: lead.name,        // ← só o nome do contacto
  email: lead.email,
  phone: lead.phone,
  company_nif: lead.company_nif,
  notes: lead.notes,
  // ❌ Falta: company: lead.company_name
});
```

O campo `company_name` da lead nunca é mapeado para o campo `company` do cliente. E no template Telecom, o `lead.name` pode conter o nome da empresa (porque `AddLeadModal` faz `name: data.company_name || data.name`), resultando no nome da empresa a aparecer no campo "Nome" do cliente em vez de no campo "Empresa".

### Correção

**`src/pages/Leads.tsx`** (linha ~276-283):
- Mapear `lead.company_name` → `company` no objeto passado ao `convertLeadToClient`
- Para Telecom: se o `lead.name` é igual ao `company_name` (fallback do AddLeadModal), usar string vazia ou o nome real do contacto

```typescript
convertLeadToClient.mutate({
  lead_id: leadId,
  name: lead.company_name && lead.name === lead.company_name 
    ? (lead.company_name) // keep company_name as name only if no separate name exists
    : lead.name,
  email: lead.email,
  phone: lead.phone,
  company: lead.company_name || undefined, // ← NOVO
  company_nif: lead.company_nif || undefined,
  notes: lead.notes || undefined,
});
```

Alteração em 1 ficheiro, ~3 linhas adicionadas/modificadas.

