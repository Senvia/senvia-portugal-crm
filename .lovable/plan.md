
## Mostrar todos os dados do cliente no modal de venda

### Problema

Atualmente, o modal de venda so mostra o nome e codigo do cliente. Para fazer uma fatura na AT, precisas de NIF, morada, email, telefone, empresa -- e tens de ir a ficha do cliente buscar esses dados.

### O que muda

Expandir a secao "Cliente" no modal para mostrar todos os campos relevantes para faturacao: NIF, empresa, email, telefone e morada completa.

### Secao tecnica

**3 ficheiros a alterar:**

**1. `src/types/sales.ts`** -- Expandir o tipo `client` dentro de `SaleWithDetails`:
```typescript
client?: {
  id: string;
  name: string;
  code?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  nif?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
} | null;
```

**2. `src/hooks/useSales.ts`** -- Expandir a query para trazer todos os campos:
```
client:crm_clients(id, name, code, email, phone, company, nif, address_line1, address_line2, city, postal_code, country)
```

**3. `src/components/sales/SaleDetailsModal.tsx`** -- Expandir a secao visual do cliente para mostrar os novos campos (NIF, empresa, email, telefone, morada), dando prioridade ao NIF e empresa por serem os mais importantes para faturacao. O email e telefone do cliente terao prioridade sobre os do lead (fallback para lead se o cliente nao tiver).
