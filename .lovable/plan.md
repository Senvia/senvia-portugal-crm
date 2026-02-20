

## Anexar Faturas nas Leads (Template Telecom)

### Contexto

No fluxo telecom, os clientes enviam faturas de eletricidade/gas para analise antes de receber proposta. Estas faturas precisam de ser anexadas na lead, visiveis nos detalhes da lead, proposta e ficha do cliente.

### Arquitetura

Criar uma tabela `lead_attachments` (em vez de um campo simples) para suportar multiplos ficheiros por lead. Usar o bucket `invoices` existente (privado) para armazenar os ficheiros.

### Alteracoes

**1. Migracao de Base de Dados**

Criar tabela `lead_attachments`:
- `id` (uuid, PK)
- `organization_id` (uuid, NOT NULL)
- `lead_id` (uuid, NOT NULL, FK -> leads)
- `file_path` (text, NOT NULL) - caminho no bucket
- `file_name` (text, NOT NULL) - nome original
- `file_size` (integer) - tamanho em bytes
- `file_type` (text) - mime type
- `uploaded_by` (uuid) - quem fez upload
- `created_at` (timestamptz)

RLS: Membros da organizacao podem ver, inserir e eliminar anexos das suas leads.

**2. Criar componente `LeadAttachments`** (`src/components/leads/LeadAttachments.tsx`)

Componente reutilizavel que:
- Lista ficheiros anexados a uma lead (com icone, nome, tamanho)
- Botao para fazer upload (PDF, PNG, JPG, max 10MB)
- Botao para descarregar (signed URL do bucket privado)
- Botao para eliminar ficheiro
- Suporta multiplos ficheiros

**3. Criar hook `useLeadAttachments`** (`src/hooks/useLeadAttachments.ts`)

- `useLeadAttachments(leadId)` - listar anexos
- `useUploadLeadAttachment()` - upload para storage + insert na tabela
- `useDeleteLeadAttachment()` - remove do storage + delete da tabela
- Funcao `getAttachmentUrl(path)` - gerar signed URL para download

**4. Atualizar `AddLeadModal.tsx`** (apenas telecom)

- Adicionar secao "Anexar Faturas" com zona de drag-and-drop
- Suportar multiplos ficheiros antes de submeter
- Apos criar a lead, fazer upload dos ficheiros e inserir na tabela

**5. Atualizar `LeadDetailsModal.tsx`**

- Adicionar secao "Faturas Anexadas" (apenas telecom) com o componente `LeadAttachments`
- Permitir adicionar mais ficheiros e remover existentes

**6. Atualizar `ProposalDetailsModal.tsx`**

- Na secao de detalhes, mostrar os anexos da lead associada (read-only)
- Usar o `lead_id` da proposta para buscar os anexos

**7. Atualizar `ClientDetailsModal.tsx`**

- Mostrar todos os anexos das leads associadas ao cliente
- Usar o `lead_id` do cliente para buscar os anexos (ou buscar todas as leads do cliente)

**8. Atualizar `submit-lead` Edge Function**

- Nao precisa de alteracao para ficheiros (os formularios publicos enviam ficheiros diretamente via storage)
- Alternativa: aceitar ficheiros base64 no payload e guardar - mas para MVP, os formularios publicos podem nao precisar de anexar faturas (isso e feito manualmente pelo comercial)

### Detalhes Tecnicos

```text
Fluxo de Upload:
  1. Utilizador seleciona ficheiro(s)
  2. Upload para storage bucket "invoices" -> path: {org_id}/leads/{lead_id}/{timestamp}-{filename}
  3. Insert na tabela lead_attachments com o path

Fluxo de Download:
  1. Gerar signed URL (createSignedUrl) do bucket privado
  2. Abrir em nova tab

Visibilidade:
  - Lead Details: Upload + Download + Delete
  - Proposta Details: Download only (via lead_id)
  - Cliente Details: Download only (via lead_id do cliente)
```

### Resultado

- Comerciais telecom podem anexar faturas de eletricidade ao criar ou editar uma lead
- As faturas ficam acessiveis nos detalhes da lead, na proposta e na ficha do cliente
- Suporte para multiplos ficheiros por lead
- Bucket privado garante seguranca dos documentos

