

## Fix: CreateSaleModal e EditSaleModal não respeitam `sale_fields_settings`

### Problema
O `CreateSaleModal` e `EditSaleModal` usam verificações hardcoded (`isTelecom`) para mostrar/esconder campos como "Numero Proposta EDP". As definições de campos configuradas em Definições → Campos → Vendas (`sale_fields_settings`) são completamente ignoradas. Mesmo desativando o campo EDP nas definições, ele continua a aparecer como obrigatório para organizações telecom.

### Correção

#### 1. `src/components/sales/CreateSaleModal.tsx`
- Importar `useSaleFieldsSettings` 
- Usar as settings para controlar visibilidade e obrigatoriedade dos campos: `value`, `payment_method`, `due_date`, `notes`, `edp_proposal_number`
- Substituir `{isTelecom && (...EDP card...)}` por `{saleFields.edp_proposal_number.visible && (...)}` 
- Aplicar `required` dinâmico baseado em `saleFields[key].required`
- Usar labels dinâmicos das settings
- Remover a validação hardcoded que bloqueia sem EDP — respeitar apenas `field.required`

#### 2. `src/components/sales/EditSaleModal.tsx`
- Mesmo padrão: importar settings e condicionar visibilidade/obrigatoriedade dos mesmos campos

#### 3. `src/components/sales/SaleDetailsModal.tsx`
- Condicionar exibição do EDP no detalhe: mostrar apenas se `saleFields.edp_proposal_number.visible`

### Resultado
- Campos de venda respeitam as definições da organização
- "Escolha Inteligente" (telecom) pode desativar o EDP e criar vendas normalmente
- Labels e obrigatoriedade dinâmicos em Create, Edit e Details

