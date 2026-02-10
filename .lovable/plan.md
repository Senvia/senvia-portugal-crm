

## Integração InvoiceXpress - Emissão de Faturas

### O que o utilizador precisa fornecer

Duas credenciais, ambas disponiveis em **InvoiceXpress -> Conta -> Integrações -> API**:

1. **Account Name** -- o subdominio da conta (ex: `minhaempresa`)
2. **API Key** -- chave de autenticacao da API

### Alteracoes necessarias

#### 1. Base de dados -- nova migracao

Adicionar 2 colunas a tabela `organizations`:
```sql
ALTER TABLE public.organizations
  ADD COLUMN invoicexpress_account_name text,
  ADD COLUMN invoicexpress_api_key text;
```

#### 2. Tipo TypeScript -- `src/hooks/useOrganization.ts`

Adicionar os novos campos ao `UpdateOrganizationData`:
```typescript
invoicexpress_account_name?: string | null;
invoicexpress_api_key?: string | null;
```

#### 3. Pagina Settings -- `src/pages/Settings.tsx`

Adicionar estado e handler para InvoiceXpress (seguindo o mesmo padrao do Brevo):
- `invoiceXpressAccountName` / `setInvoiceXpressAccountName`
- `invoiceXpressApiKey` / `setInvoiceXpressApiKey`
- `showInvoiceXpressApiKey` / `setShowInvoiceXpressApiKey`
- `handleSaveInvoiceXpress()`
- Carregar os valores da organizacao no `useEffect` existente

#### 4. Componente de Integrações -- `src/components/settings/IntegrationsContent.tsx`

Adicionar nova secao no Accordion (seguindo o padrao do Brevo):
- Icone: `Receipt` (ja importado no Settings)
- Titulo: "Faturacao (InvoiceXpress)"
- Badge de estado: Configurado / Nao configurado
- Campos:
  - **Account Name** (input text, visivel)
  - **API Key** (input password com toggle show/hide)
- Nota informativa: "Encontre estas credenciais em InvoiceXpress -> Conta -> Integracoes -> API"
- Botao "Guardar"

#### 5. Props do componente

Expandir a interface `IntegrationsContentProps` com os novos campos:
```typescript
invoiceXpressAccountName: string;
setInvoiceXpressAccountName: (value: string) => void;
invoiceXpressApiKey: string;
setInvoiceXpressApiKey: (value: string) => void;
showInvoiceXpressApiKey: boolean;
setShowInvoiceXpressApiKey: (value: boolean) => void;
handleSaveInvoiceXpress: () => void;
```

### Nota sobre emissao de faturas

Esta fase configura apenas as **credenciais** na pagina de integracoes. A emissao efetiva de faturas (botao "Emitir Fatura" no modal de venda, Edge Function para chamar a API do InvoiceXpress) sera um passo seguinte, apos as credenciais estarem guardadas.

