

## Botoes de Ativar/Desativar Integracoes

### O que muda

Cada integracao (Webhook, WhatsApp, Brevo, InvoiceXpress) vai ter um **Switch (toggle)** no header do accordion que permite ativar ou desativar a integracao. Quando desativada, as credenciais ficam guardadas na base de dados mas a integracao nao e utilizada pelo sistema.

### Comportamento

- **Switch ON**: A integracao funciona normalmente (webhook dispara, fatura pode ser emitida, emails sao enviados, etc.)
- **Switch OFF**: Credenciais mantidas, mas o sistema ignora a integracao. O badge muda para "Desativado" (cinzento). Os campos de configuracao continuam visiveis dentro do accordion para que o utilizador possa reconfigurar antes de reativar.
- O switch guarda automaticamente ao clicar (sem precisar de carregar "Guardar")
- O `SaleDetailsModal` ja valida se existem credenciais InvoiceXpress -- vai passar a validar tambem se a integracao esta ativa

### Secao tecnica

#### 1. Migracao de base de dados

Adicionar uma coluna JSONB para guardar o estado de cada integracao:

```sql
ALTER TABLE public.organizations
  ADD COLUMN integrations_enabled jsonb 
  DEFAULT '{"webhook": true, "whatsapp": true, "brevo": true, "invoicexpress": true}'::jsonb;
```

Usar JSONB permite adicionar novas integracoes no futuro sem novas migracoes.

#### 2. Atualizar `Organization` interface em `AuthContext.tsx`

Adicionar o campo:
```typescript
integrations_enabled?: {
  webhook?: boolean;
  whatsapp?: boolean;
  brevo?: boolean;
  invoicexpress?: boolean;
};
```

#### 3. Atualizar `IntegrationsContent.tsx`

- Importar o componente `Switch`
- Adicionar props: `integrationsEnabled` (objeto com estados) e `onToggleIntegration` (callback que recebe key + novo estado)
- No `AccordionTrigger` de cada integracao, adicionar um Switch ao lado do nome/badge
- O Switch faz `e.stopPropagation()` para nao abrir/fechar o accordion ao clicar
- Badge logica atualizada:
  - Se desativado: Badge cinzento "Desativado" (independentemente de ter credenciais)
  - Se ativado + credenciais: Badge verde "Configurado"
  - Se ativado + sem credenciais: Badge vermelho "Nao configurado"

#### 4. Atualizar componente pai (Settings.tsx ou onde IntegrationsContent e gerido)

- Ler `integrations_enabled` da organizacao
- Criar handler `onToggleIntegration` que faz update direto na tabela `organizations`
- Passar como props ao `IntegrationsContent`

#### 5. Atualizar `SaleDetailsModal.tsx`

A logica `hasInvoiceXpress` passa a incluir a verificacao do toggle:

```typescript
const hasInvoiceXpress = organization?.integrations_enabled?.invoicexpress !== false
  && organization?.invoicexpress_account_name 
  && organization?.invoicexpress_api_key;
```

#### 6. Atualizar edge functions relevantes

A edge function `issue-invoice` deve verificar se `integrations_enabled.invoicexpress` esta ativo antes de processar.

### Ficheiros a criar/alterar

| Ficheiro | Acao |
|---|---|
| `supabase/migrations/...` | Nova migracao (1 coluna JSONB) |
| `src/contexts/AuthContext.tsx` | Adicionar tipo `integrations_enabled` |
| `src/components/settings/IntegrationsContent.tsx` | Adicionar Switch + badge logica |
| Componente pai das integracoes (Settings) | Handler toggle + nova prop |
| `src/components/sales/SaleDetailsModal.tsx` | Verificar toggle na logica condicional |
| `supabase/functions/issue-invoice/index.ts` | Verificar toggle antes de emitir |

