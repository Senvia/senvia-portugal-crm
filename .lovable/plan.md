

## Funcionalidade: Anexar Ficheiro de Fatura aos Pagamentos

### Conceito

Quando registares um pagamento, podes anexar o ficheiro PDF da fatura. Depois, na página de Faturas do módulo financeiro, cada linha terá um botão para fazer download do ficheiro.

---

### Fluxo de Utilização

```text
1. Utilizador adiciona pagamento numa venda
2. Preenche referência da fatura (FT 2024/001)
3. Clica "Anexar Fatura" e seleciona o PDF
4. Ficheiro é carregado para o storage
5. Na página /financeiro/faturas, vê botão de download
6. Clica e faz download do PDF original
```

---

### Alterações Necessárias

#### 1. Base de Dados

**Novo campo na tabela `sale_payments`:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `invoice_file_url` | TEXT | URL do ficheiro da fatura no storage |

**Novo bucket de storage:**

| Bucket | Público | Limite |
|--------|---------|--------|
| `invoices` | Não (privado) | 10MB |

---

#### 2. Migração SQL

```sql
-- Adicionar campo para URL do ficheiro
ALTER TABLE sale_payments 
ADD COLUMN invoice_file_url TEXT;

-- Criar bucket privado para faturas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'invoices', 
  'invoices', 
  false, 
  10485760,  -- 10MB
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
);

-- Políticas RLS para o bucket
CREATE POLICY "Org members can upload invoices"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM organizations 
    WHERE id = get_user_org_id(auth.uid())
  )
);

CREATE POLICY "Org members can read invoices"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM organizations 
    WHERE id = get_user_org_id(auth.uid())
  )
);

CREATE POLICY "Org members can delete invoices"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'invoices' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM organizations 
    WHERE id = get_user_org_id(auth.uid())
  )
);
```

---

### 3. Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/types/sales.ts` | Adicionar `invoice_file_url` à interface `SalePayment` |
| `src/types/finance.ts` | Adicionar `invoice_file_url` à interface `PaymentWithSale` |
| `src/components/sales/AddPaymentModal.tsx` | Adicionar upload de ficheiro |
| `src/hooks/useSalePayments.ts` | Incluir `invoice_file_url` nas operações |
| `src/pages/finance/Invoices.tsx` | Adicionar botão de download |

---

### 4. Interface do Modal de Pagamento

Nova secção no modal `AddPaymentModal`:

```text
┌──────────────────────────────────────────────────────────────┐
│  Referência da Fatura                                        │
│  [FT 2024/0001______________]                                │
│                                                              │
│  📎 Anexar Ficheiro                                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  [PDF Icon] fatura-janeiro.pdf          [× Remover]    │  │
│  └────────────────────────────────────────────────────────┘  │
│  ou                                                          │
│  ┌──────────────────────────────────────────────────────────┐│
│  │        📄 Arraste o ficheiro ou clique para selecionar  ││
│  │               PDF, PNG, JPG • Máx. 10MB                 ││
│  └──────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```

---

### 5. Interface da Tabela de Faturas

Nova coluna na tabela de faturas:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Referência   │ Data       │ Venda   │ Cliente    │ Valor  │ Anexo │
├────────────────────────────────────────────────────────────────────┤
│ FT 2024/001  │ 04/02/2026 │ #0015   │ João Silva │ €500   │ [↓]   │
│ FT 2024/002  │ 01/02/2026 │ #0012   │ Maria      │ €600   │  --   │
└────────────────────────────────────────────────────────────────────┘

[↓] = Botão de download (só aparece se tiver ficheiro anexo)
```

---

### 6. Componente de Upload (InvoiceUploader)

Criar componente reutilizável para upload de faturas:

```typescript
// src/components/sales/InvoiceUploader.tsx

interface InvoiceUploaderProps {
  value: string | null;
  onChange: (url: string | null) => void;
  paymentId?: string; // Para organizar ficheiros por pagamento
}
```

Funcionalidades:
- Upload de PDF, PNG ou JPG
- Limite de 10MB
- Preview do nome do ficheiro
- Botão remover
- Progresso de upload

---

### 7. Lógica de Download

Como o bucket é privado, usamos `createSignedUrl` para gerar URLs temporárias:

```typescript
const downloadInvoice = async (fileUrl: string) => {
  // Extrair o path do URL
  const path = extractPathFromUrl(fileUrl);
  
  // Gerar URL assinada (válida por 60 segundos)
  const { data, error } = await supabase.storage
    .from('invoices')
    .createSignedUrl(path, 60);
  
  if (data) {
    // Abrir numa nova tab ou fazer download
    window.open(data.signedUrl, '_blank');
  }
};
```

---

### Resumo de Implementação

| Passo | Tipo | Descrição |
|-------|------|-----------|
| 1 | Migração SQL | Adicionar coluna + criar bucket + RLS |
| 2 | Tipos | Atualizar `SalePayment` e `PaymentWithSale` |
| 3 | Componente | Criar `InvoiceUploader.tsx` |
| 4 | Modal | Integrar uploader no `AddPaymentModal` |
| 5 | Hook | Atualizar `useSalePayments` |
| 6 | Página | Adicionar coluna de download em `Invoices.tsx` |

**Total: 1 migração + 1 novo componente + 4 ficheiros modificados**

---

### Segurança

| Aspecto | Implementação |
|---------|---------------|
| Acesso | Apenas membros da organização podem ver/fazer upload |
| Bucket | Privado (não acessível publicamente) |
| URLs | Geradas temporariamente com `createSignedUrl` |
| Estrutura | Ficheiros organizados por `{org_id}/{payment_id}/{filename}` |

