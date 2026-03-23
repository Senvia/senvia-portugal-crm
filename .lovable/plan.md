

## Criar Pop-up de Novidades (What's New) pós-login

### Conceito
Um modal/dialog que aparece automaticamente após o login mostrando novidades do sistema. Excluir utilizadores da organização P2G. O conteúdo das novidades será gerido via uma tabela no banco de dados para facilitar atualizações futuras.

### Alterações

**1) Migration — tabela `app_announcements`**
- `id uuid`, `title text`, `content text` (suporta markdown/HTML), `version text` (ex: "v2.5"), `image_url text?`, `published_at timestamptz`, `is_active boolean default true`, `created_at`
- RLS: SELECT para `authenticated`

**2) `src/components/announcements/WhatsNewDialog.tsx`** (novo)
- Dialog com título, conteúdo formatado, botão "Entendi"
- Ao fechar, guarda `localStorage` key `senvia_last_seen_announcement_{userId}` = `announcement.id`
- Só aparece se o announcement mais recente (`is_active = true`, ordenado por `published_at desc`) ainda não foi visto pelo user

**3) `src/components/auth/ProtectedLayoutRoute.tsx`**
- Importar `WhatsNewDialog` e `isPerfect2GetherOrg`
- Renderizar `<WhatsNewDialog />` dentro do `<AppLayout>`, passando `organizationId`
- O componente internamente verifica se é P2G e não se mostra

**4) `src/hooks/useAnnouncements.ts`** (novo)
- Query para buscar o announcement ativo mais recente
- Lógica de verificação com localStorage para saber se já foi visto

### Fluxo
1. User faz login → `ProtectedLayoutRoute` renderiza
2. `WhatsNewDialog` carrega announcement mais recente da tabela
3. Se org é P2G → não mostra
4. Se user já viu este announcement (localStorage) → não mostra
5. Caso contrário → mostra modal com novidades
6. User clica "Entendi" → marca como visto no localStorage

### Ficheiros
| Ficheiro | Acção |
|----------|-------|
| Migration SQL | Criar tabela `app_announcements` |
| `src/hooks/useAnnouncements.ts` | Novo — fetch + lógica de visto |
| `src/components/announcements/WhatsNewDialog.tsx` | Novo — UI do dialog |
| `src/components/auth/ProtectedLayoutRoute.tsx` | Renderizar WhatsNewDialog |

