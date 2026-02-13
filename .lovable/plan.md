
# Adicionar Toggle de Faturacao nas Definicoes Fiscais

## Objetivo
Adicionar um switch em **Definicoes > Financeiro > Fiscal** para ativar/desativar a faturacao globalmente. Quando desativado, o card "Faturacao" (escolha entre faturar cliente ou empresa) desaparece dos formularios de criacao e edicao de clientes.

## Alteracoes

### 1. `src/components/settings/FiscalSettingsTab.tsx`
- Adicionar nova prop `invoicingEnabled` (boolean) e `setInvoicingEnabled`
- Adicionar um Switch no topo do card com label "Faturacao ativa" e descricao explicativa
- Quando desativado, as configuracoes de IVA ficam visualmente desativadas (opacidade reduzida)
- Importar o componente `Switch`

### 2. `src/pages/Settings.tsx`
- Adicionar estado `invoicingEnabled` (default: `true`)
- Carregar o valor de `tax_config.invoicing_enabled` na funcao `fetchIntegrations`
- Passar as novas props ao `FiscalSettingsTab`
- Incluir `invoicing_enabled` no `handleSaveFiscal` dentro do objeto `tax_config`

### 3. `src/components/clients/CreateClientModal.tsx`
- Ler `tax_config` da organizacao via `useAuth()`
- Condicionar a renderizacao do card "Faturacao" (linhas 352-395) a `tax_config.invoicing_enabled !== false`
- Quando oculto, definir `billingTarget` como `'client'` por defeito (sem escolha)

### 4. `src/components/clients/EditClientModal.tsx`
- Mesma logica condicional que o CreateClientModal para o card "Faturacao"

## Detalhe tecnico

A flag sera armazenada dentro do JSONB `tax_config` existente na tabela `organizations`:

```json
{
  "tax_name": "IVA23",
  "tax_value": 23,
  "tax_exemption_reason": null,
  "invoicing_enabled": true
}
```

Nao requer migracao de base de dados -- o campo JSONB ja existe e aceita propriedades adicionais. Organizacoes sem esta propriedade assumem `true` por defeito (retrocompativel).

## Ficheiros alterados
- `src/components/settings/FiscalSettingsTab.tsx`
- `src/pages/Settings.tsx`
- `src/components/clients/CreateClientModal.tsx`
- `src/components/clients/EditClientModal.tsx`
