

# Adicionar campo `code` auto-gerado aos Produtos

## Contexto

Clientes, Propostas e Vendas ja possuem um campo `code` com formato sequencial `0001`, `0002`, etc., gerado automaticamente por triggers na base de dados. Os Produtos nao possuem este campo, o que causa problemas na integracao com o KeyInvoice (que exige um `IdProduct` valido). Atualmente, o `IdProduct` e gerado ad-hoc no edge function a partir do nome do produto, o que e fragil e inconsistente.

## Plano

### 1. Migracao de base de dados

- Adicionar coluna `code TEXT` a tabela `products`
- Criar funcao `generate_product_code(org_id UUID)` seguindo o padrao existente (sequencial `0001`, `0002`, por organizacao)
- Criar trigger `set_product_code` que preenche automaticamente o `code` no INSERT (mesmo padrao de `set_client_code`, `set_sale_code`, etc.)
- Criar indice unico composto `(organization_id, code)` para garantir unicidade por tenant
- Preencher codigos nos produtos existentes (backfill)

### 2. Atualizar tipo TypeScript

- Adicionar `code?: string | null` ao interface `Product` em `src/types/proposals.ts`

### 3. Atualizar edge function `issue-invoice`

- Usar `product.code` (do produto do catalogo) como `IdProduct` ao criar/procurar produtos no KeyInvoice, em vez de gerar um codigo ad-hoc a partir do nome
- Fallback: se o produto nao tiver `code`, manter a logica atual baseada no nome

### 4. Mostrar o codigo na UI (opcional mas util)

- Exibir o codigo do produto na listagem do tab Produtos (`ProductsTab.tsx`) como referencia visual

## Detalhes tecnicos

**Funcao SQL (seguindo o padrao existente):**
```sql
CREATE OR REPLACE FUNCTION generate_product_code(_org_id UUID)
RETURNS TEXT AS $$
DECLARE _count INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(code, '[^0-9]', '', 'g'), '') AS INTEGER)
  ), 0) + 1
  INTO _count
  FROM products
  WHERE organization_id = _org_id AND code IS NOT NULL;
  RETURN LPAD(_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
```

**Trigger (mesmo padrao):**
```sql
CREATE TRIGGER set_product_code
BEFORE INSERT ON products
FOR EACH ROW
WHEN (NEW.code IS NULL)
EXECUTE FUNCTION set_product_code_trigger();
```

**Edge function -- uso do code como IdProduct:**
```typescript
const itemCode = product?.code || itemName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20) || 'SRV001'
```

**Ficheiros a alterar:**
- Nova migracao SQL (schema + backfill)
- `src/types/proposals.ts` -- adicionar campo `code`
- `supabase/functions/issue-invoice/index.ts` -- usar `code` como `IdProduct`
- `src/components/settings/ProductsTab.tsx` -- mostrar codigo na listagem

