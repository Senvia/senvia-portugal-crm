

# Plano de Integração KeyInvoice (CloudInvoice)

## Contexto

O Senvia OS utiliza atualmente o **InvoiceXpress** como motor de faturacao. Este plano adiciona suporte ao **KeyInvoice** (CloudInvoice) como alternativa, permitindo que cada organizacao escolha qual sistema de faturacao usar. A arquitetura existente (credenciais na tabela `organizations`, Edge Functions, UI de integracao) sera estendida para suportar ambos.

---

## Resumo da API KeyInvoice

| Area | Endpoint | Metodo |
|------|----------|--------|
| **Auth** | `/auth/login/` | POST (username + password + company_code) -> retorna token |
| **Documentos** | `/documents/sales/` | GET (listar) |
| | `/documents/new/` | POST (criar) |
| | `/documents/:id/` | GET (consultar) |
| | `/documents/:id/details/` | GET (linhas) |
| | `/documents/:id/payments/` | GET (pagamentos) |
| | `/documents/:id/finalize/` | POST |
| | `/documents/:id/annul/` | POST |
| | `/documents/:id/print/` | POST (gerar PDF) |
| | `/documents/:id/email/` | POST |
| | `/documents/:id/delete/` | POST |
| | `/documents/:id/emit_credit_note/` | POST |
| **Config** | `/documents/configs/` | GET (tipos doc) |
| | `/series/` e `/series/:id/` | GET |
| **Clientes** | `/customers/` | GET |
| **Produtos** | `/products/` e `/products/new/` | GET / POST |
| **Fiscal** | `/tax_exemptions/` | GET |

**Autenticacao**: `POST /auth/login/` com `username`, `password`, `company_code` -> devolve `{ "key": "token" }`. O token e usado como `Authorization: Token <key>` nos pedidos subsequentes.

---

## Fases de Implementacao

### Fase 1: Base de Dados

Adicionar novas colunas a tabela `organizations`:

```sql
ALTER TABLE organizations
  ADD COLUMN billing_provider text DEFAULT 'invoicexpress',
  ADD COLUMN keyinvoice_username text,
  ADD COLUMN keyinvoice_password text,
  ADD COLUMN keyinvoice_company_code text,
  ADD COLUMN keyinvoice_token text,
  ADD COLUMN keyinvoice_token_expires_at timestamptz;
```

- `billing_provider`: `'invoicexpress'` ou `'keyinvoice'` -- determina qual sistema usar
- As credenciais do KeyInvoice sao armazenadas por organizacao (mesmo padrao do InvoiceXpress)
- O token e cacheado na BD para evitar login a cada pedido

---

### Fase 2: UI de Configuracao (Settings -> Integracoes)

Modificar `IntegrationsContent.tsx` e o componente pai `Settings.tsx`:

1. **Substituir** a seccao fixa "Faturacao (InvoiceXpress)" por uma seccao generica "Faturacao" com um **seletor de fornecedor** (InvoiceXpress / KeyInvoice)
2. Quando `billing_provider === 'keyinvoice'`, mostrar campos:
   - Email do utilizador KeyInvoice
   - Password
   - Codigo da Empresa (company_code)
   - Selecao de Serie (dropdown carregado via API `/series/`)
   - Tipo de Documento padrao (FT, FR, FS -- dropdown carregado via `/documents/configs/`)
3. Quando `billing_provider === 'invoicexpress'`, manter os campos atuais (Account Name + API Key)
4. Manter a configuracao de IVA (taxa + motivo de isencao) que e independente do fornecedor

---

### Fase 3: Edge Functions -- Camada de Abstracao

Criar/modificar Edge Functions para suportar ambos os fornecedores:

#### 3a. Nova Edge Function: `keyinvoice-auth`
- Recebe `organization_id`
- Verifica se o token em cache ainda e valido
- Se expirado, faz `POST /auth/login/` para obter novo token
- Guarda o token atualizado na tabela `organizations`
- Retorna o token valido

#### 3b. Nova Edge Function: `keyinvoice-issue-invoice`
- Equivalente ao `issue-invoice` atual (que usa InvoiceXpress)
- Fluxo:
  1. Obter token via logica de `keyinvoice-auth`
  2. Obter dados da venda + cliente + items
  3. Mapear para payload KeyInvoice (`POST /documents/new/`)
  4. Finalizar o documento (`POST /documents/:id/finalize/`)
  5. Gerar e descarregar PDF (`POST /documents/:id/print/`)
  6. Guardar referencia na tabela `sales`

#### 3c. Modificar Edge Functions existentes para routing
- `issue-invoice`: verificar `billing_provider` da org -> chamar InvoiceXpress ou redirecionar para `keyinvoice-issue-invoice`
- `cancel-invoice`: adicionar ramo KeyInvoice (`POST /documents/:id/annul/`)
- `generate-receipt`: adicionar ramo KeyInvoice (pagamentos via `/documents/:id/payments/`)
- `create-credit-note`: adicionar ramo KeyInvoice (`POST /documents/:id/emit_credit_note/`)
- `sync-invoices`: adicionar ramo KeyInvoice (listar via `/documents/sales/`)
- `sync-credit-notes`: adicionar ramo KeyInvoice (filtrar NC do `/documents/sales/`)
- `get-invoice-details`: adicionar ramo KeyInvoice (`GET /documents/:id/` + `/documents/:id/details/`)
- `send-invoice-email`: adicionar ramo KeyInvoice (`POST /documents/:id/email/`)

#### 3d. Nova Edge Function: `keyinvoice-sync-products`
- Sincronizar produtos do KeyInvoice (`GET /products/`) com a tabela local `products`
- Criar produtos no KeyInvoice (`POST /products/new/`) quando necessario

---

### Fase 4: Mapeamento de Dados

Mapeamento entre campos internos do Senvia e campos KeyInvoice:

| Senvia | KeyInvoice |
|--------|-----------|
| `invoicexpress_id` | `document.id` (reutilizar mesmo campo, agnóstico) |
| `invoicexpress_type` | Mapear: `invoice` -> codigo da natureza (FT/FR/FS) |
| `invoice_reference` | `sequence_number` do documento |
| Status `finalized` | Estado `F` (Finalizado) |
| Status `cancelled` | Estado `A` (Anulado) |
| IVA 23% | `tax_code: NOR`, `tax_type: IVA` |
| IVA 13% | `tax_code: INT` |
| IVA 6% | `tax_code: RED` |
| Isento | `tax_code: ISE` + `tax_exemption` (M01-M16) |
| Pagamento TB | `payment_mechanism: TB` |
| Pagamento CC | `payment_mechanism: CC` |
| Pagamento MB | `payment_mechanism: MB` |
| Pagamento NU | `payment_mechanism: NU` |

---

### Fase 5: Frontend -- Adaptacoes

Ficheiros a modificar:

1. **`SaleFiscalInfo.tsx`**: Renomear `isInvoiceXpressActive` para `isBillingActive` -- verificar ambos os fornecedores
2. **`SaleDetailsModal.tsx`**: Usar funcao generica em vez de verificar InvoiceXpress diretamente
3. **`InvoicesContent.tsx`**: Manter como esta -- a tabela `invoices` ja e generica
4. **`CancelInvoiceDialog.tsx`**: Substituir texto "InvoiceXpress" por "sistema de faturacao"
5. **`ProductsTab.tsx`**: Adicionar botao de sync para KeyInvoice alem do InvoiceXpress
6. **Hooks (`useIssueInvoice`, `useCancelInvoice`, etc.)**: Sem alteracoes necessarias -- as Edge Functions tratam do routing internamente

---

## Detalhes Tecnicos

### Autenticacao KeyInvoice
- O token obtido via `/auth/login/` nao tem expiracao documentada
- Estrategia: cachear o token na BD, renovar em caso de erro 401 numa chamada subsequente
- Os campos `keyinvoice_token` e `keyinvoice_token_expires_at` permitem esta logica

### Diferenca Principal vs InvoiceXpress
- InvoiceXpress usa `api_key` como query parameter -- sem login
- KeyInvoice usa token obtido via login -- requer gestao de sessao
- InvoiceXpress tem endpoints separados por tipo (invoices, invoice_receipts, credit_notes)
- KeyInvoice tem endpoint unico `/documents/` com tipos definidos pelo `document_config_id`

### Seguranca
- Credenciais KeyInvoice ficam na tabela `organizations` (mesmo padrao das credenciais InvoiceXpress)
- Protegidas por RLS -- apenas membros da organizacao acedem
- Edge Functions usam `SUPABASE_SERVICE_ROLE_KEY` para aceder as credenciais

---

## Ordem de Implementacao

1. Migracao BD (colunas novas)
2. UI Settings (seletor de fornecedor + campos KeyInvoice)
3. Edge Function `keyinvoice-auth` (gestao de token)
4. Edge Function `keyinvoice-issue-invoice` (emissao)
5. Adaptar `issue-invoice` com routing por fornecedor
6. Adaptar restantes Edge Functions (cancel, receipt, credit note, sync, details, email)
7. Ajustes frontend (textos, verificacoes genericas)
8. Testes end-to-end

