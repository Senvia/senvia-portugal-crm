

## Adicionar gestão de Novidades no System Admin

### Resumo
Criar uma nova página `/system-admin/announcements` com CRUD completo para a tabela `app_announcements`, acessível apenas ao Super Admin. Adicionar link na dashboard do System Admin.

### Alterações

**1) `src/pages/system-admin/Announcements.tsx`** (novo)
- Página com tabela listando todas as novidades (activas e inactivas)
- Colunas: Título, Versão, Estado (activo/inactivo), Data de publicação, Acções
- Botão "Nova Novidade" que abre dialog de criação
- Cada linha tem botões: Editar, Ativar/Desativar (toggle switch), Excluir
- Dialog de criação/edição com campos: título, conteúdo (textarea com suporte markdown), versão, URL da imagem, activo (switch)
- Confirmação antes de excluir
- Ordenação por `published_at DESC`

**2) `src/pages/system-admin/Dashboard.tsx`**
- Adicionar botão "Gerir Novidades" (ícone Sparkles) ao lado dos botões existentes de Organizações e Utilizadores

**3) `src/App.tsx`**
- Adicionar rota `/system-admin/announcements` com `SuperAdminRoute` wrapper
- Lazy import do componente

### Operações na tabela `app_announcements`
- **Listar**: `SELECT *` ordenado por `published_at DESC`
- **Criar**: `INSERT` com campos preenchidos no form
- **Editar**: `UPDATE` por `id`
- **Ativar/Desativar**: `UPDATE is_active` toggle
- **Excluir**: `DELETE` por `id`

Nota: A tabela já existe com RLS para SELECT. Será necessária uma migration para adicionar políticas de INSERT/UPDATE/DELETE para super_admin (via `has_role`).

### Migration SQL
- Adicionar políticas RLS para super_admin poder inserir, atualizar e excluir announcements:
  - INSERT: `has_role(auth.uid(), 'super_admin')`
  - UPDATE: `has_role(auth.uid(), 'super_admin')`
  - DELETE: `has_role(auth.uid(), 'super_admin')`

### Ficheiros
| Ficheiro | Acção |
|----------|-------|
| Migration SQL | Adicionar RLS policies para escrita (super_admin) |
| `src/pages/system-admin/Announcements.tsx` | Novo — CRUD completo |
| `src/pages/system-admin/Dashboard.tsx` | Adicionar botão "Gerir Novidades" |
| `src/App.tsx` | Adicionar rota |

