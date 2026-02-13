
# Remover Toggle de Faturacao e Usar Integracao como Condicao

## Objetivo
Substituir o toggle manual `invoicing_enabled` pela verificacao automatica de integracao de faturacao ativa (InvoiceXpress ou KeyInvoice). O card "Faturacao" nos formularios de clientes so aparece se a empresa tiver uma integracao de faturacao configurada e ativa.

## Alteracoes

### 1. `src/components/settings/FiscalSettingsTab.tsx`
- Remover as props `invoicingEnabled` e `setInvoicingEnabled`
- Remover o Switch "Faturacao ativa" da interface
- Manter apenas as configuracoes de IVA e isencao

### 2. `src/pages/Settings.tsx`
- Remover o estado `invoicingEnabled` e `setInvoicingEnabled`
- Remover a logica de carregar/guardar `invoicing_enabled` do `tax_config`
- Remover as props correspondentes do `FiscalSettingsTab`

### 3. `src/components/clients/CreateClientModal.tsx`
- Substituir a verificacao `tax_config?.invoicing_enabled !== false` pela funcao `isBillingActive(organization)` importada de `SaleFiscalInfo.tsx`
- O card "Faturacao" so aparece quando ha uma integracao de faturacao ativa (InvoiceXpress ou KeyInvoice configurado e ligado)

### 4. `src/components/clients/EditClientModal.tsx`
- Mesma alteracao: usar `isBillingActive(organization)` para condicionar o card "Faturacao"

## Logica de decisao
A funcao `isBillingActive` (ja existente em `SaleFiscalInfo.tsx`) verifica:
- InvoiceXpress: `integrations_enabled.invoicexpress !== false` E credenciais preenchidas
- KeyInvoice: `integrations_enabled.keyinvoice === true` E password preenchida

## Ficheiros alterados
- `src/components/settings/FiscalSettingsTab.tsx`
- `src/pages/Settings.tsx`
- `src/components/clients/CreateClientModal.tsx`
- `src/components/clients/EditClientModal.tsx`
