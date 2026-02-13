

# Adicionar "Contribuinte" como Campo Configuravel nas Definicoes

## Problema
O campo "Contribuinte (Empresa)" (`company_nif`) nao esta no sistema de campos configuraveis. Apenas existe o campo `nif` (NIF Cliente). A Perfect2Gether precisa que o Contribuinte da empresa seja obrigatorio, mas o NIF pessoal nao.

## Alteracoes

### 1. `src/types/clients.ts`
- Adicionar `'company_nif'` ao tipo `ClientFieldKey`
- Adicionar `company_nif: ClientFieldConfig` ao `ClientFieldsSettings`
- Adicionar entrada em `CLIENT_FIELD_DEFAULTS` e `DEFAULT_CLIENT_FIELDS_SETTINGS`

### 2. `src/components/settings/ClientFieldsEditor.tsx`
- Adicionar icone para `company_nif` em `FIELD_ICONS`
- Adicionar `'company_nif'` ao `FIELD_ORDER` (depois de `company`)

### 3. `src/components/clients/CreateClientModal.tsx`
- O campo "Contribuinte (Empresa)" passa a respeitar `settings.company_nif.visible` e `settings.company_nif.required`
- Adicionar validacao de `companyNif` no `isValid` quando `settings.company_nif.required`

### 4. `src/components/clients/EditClientModal.tsx`
- Mesmas alteracoes que o CreateClientModal

### 5. Atualizar settings da Perfect2Gether
- Depois de implementar, o administrador podera ir a Definicoes > Campos e configurar: NIF (Cliente) = nao obrigatorio, Contribuinte (Empresa) = obrigatorio

## Ficheiros alterados
- `src/types/clients.ts`
- `src/components/settings/ClientFieldsEditor.tsx`
- `src/components/clients/CreateClientModal.tsx`
- `src/components/clients/EditClientModal.tsx`
