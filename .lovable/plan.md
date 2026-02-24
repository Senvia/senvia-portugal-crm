

# Adicionar Campo "Numero Proposta EDP" nas Vendas

## Resumo
Adicionar um novo campo obrigatorio chamado "Numero Proposta EDP" ao modulo de Vendas. Isto requer alteracoes na base de dados, nos tipos TypeScript, nos formularios de criacao/edicao e na visualizacao de detalhes.

---

## Seccao Tecnica

### 1. Migracao de Base de Dados
Adicionar coluna `edp_proposal_number` (tipo `text`, nullable) na tabela `sales`:

```sql
ALTER TABLE public.sales ADD COLUMN edp_proposal_number text;
```

### 2. Tipos TypeScript (`src/types/sales.ts`)
- Adicionar `edp_proposal_number?: string | null;` na interface `Sale`

### 3. Tipos de Field Settings (`src/types/field-settings.ts`)
- Adicionar `'edp_proposal_number'` ao tipo `SaleFieldKey`
- Adicionar entrada no `DEFAULT_SALE_FIELDS_SETTINGS` com `visible: true, required: true, label: 'Numero Proposta EDP'`
- Adicionar ao `SALE_FIELD_ORDER`

### 4. Hook `useSales.ts`
- Adicionar `edp_proposal_number` ao `useCreateSale` (mutationFn e insert)
- Adicionar `edp_proposal_number` ao `useUpdateSale` (updates type e update call)

### 5. CreateSaleModal (`src/components/sales/CreateSaleModal.tsx`)
- Adicionar state `edpProposalNumber`
- Adicionar campo Input obrigatorio no formulario
- Passar valor no `createSale.mutateAsync()`
- Validar que nao esta vazio antes de submeter

### 6. EditSaleModal (`src/components/sales/EditSaleModal.tsx`)
- Adicionar state `edpProposalNumber` inicializado com `sale.edp_proposal_number`
- Adicionar campo Input no formulario
- Passar valor no `updateSale.mutateAsync()`

### 7. SaleDetailsModal (`src/components/sales/SaleDetailsModal.tsx`)
- Mostrar o campo "Numero Proposta EDP" na secao de detalhes da venda

### 8. SaleFieldsEditor (`src/components/settings/SaleFieldsEditor.tsx`)
- Adicionar icone para o novo campo `edp_proposal_number` no `FIELD_ICONS`

### Ficheiros a alterar:
- Migracao SQL (nova coluna)
- `src/types/field-settings.ts`
- `src/types/sales.ts`
- `src/hooks/useSales.ts`
- `src/components/sales/CreateSaleModal.tsx`
- `src/components/sales/EditSaleModal.tsx`
- `src/components/sales/SaleDetailsModal.tsx`
- `src/components/settings/SaleFieldsEditor.tsx`

