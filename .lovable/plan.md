

## Criar Secção "Suporte" nas Definições + Corrigir Instruções do Otto

### Problema

O Otto diz ao utilizador para ir a **Definições > Suporte > Os Meus Tickets**, mas essa secção não existe. A tabela `support_tickets` existe na base de dados, mas não há UI para consultar tickets.

### Solução

Criar a secção "Suporte" nas Definições e actualizar o prompt do Otto com o caminho correcto.

---

### 1. Novo componente — `src/components/settings/SupportTicketsTab.tsx`

Componente que lista os tickets de suporte da organização:
- Busca tickets da tabela `support_tickets` filtrados por `organization_id`
- Mostra tabela com: Código (`ticket_code`), Assunto, Prioridade (badge colorido), Estado (badge), Data de criação
- Ordenados por data (mais recente primeiro)
- Estado vazio com mensagem "Nenhum ticket de suporte encontrado"
- Clique num ticket expande para ver a descrição completa
- Responsivo (cards em mobile, tabela em desktop)

### 2. Actualizar — `src/components/settings/MobileSettingsNav.tsx`

- Adicionar `"support"` ao tipo `SettingsSection`
- Adicionar `"support-tickets"` ao tipo `SettingsSubSection`
- Adicionar card na lista `sections`:
  ```
  { id: "support", label: "Suporte", icon: LifeBuoy, description: "Tickets e pedidos de ajuda" }
  ```
- Adicionar ao `subSectionsMap` (vazio, conteúdo directo)
- Adicionar ao `directContentGroups`: `"support"`
- Adicionar ao `sectionTitles`: `support: "Suporte"`

### 3. Actualizar — `src/pages/Settings.tsx`

- Importar `SupportTicketsTab`
- Adicionar case `"support-tickets"` no `renderSubContent`
- Adicionar case `"support"` no `getDirectSub`

### 4. Actualizar — `supabase/functions/otto-chat/index.ts`

No `SYSTEM_PROMPT`, após a submissão do ticket, adicionar instrução:
```
- Após submissão, informa: "Podes consultar o estado dos teus tickets em **Definições > Suporte**."
```

Actualizar o MAPA DE ROTAS para incluir a rota correcta.

### 5. Hook — `src/hooks/useSupportTickets.ts`

Hook simples com React Query para buscar tickets:
- Query: `supabase.from('support_tickets').select('*').eq('organization_id', orgId).order('created_at', { ascending: false })`
- Retorna `{ tickets, isLoading }`

---

### Ficheiros a criar/alterar

| Ficheiro | Acção |
|---|---|
| `src/components/settings/SupportTicketsTab.tsx` | **Criar** — Lista de tickets |
| `src/hooks/useSupportTickets.ts` | **Criar** — Hook de dados |
| `src/components/settings/MobileSettingsNav.tsx` | **Alterar** — Adicionar secção "Suporte" |
| `src/pages/Settings.tsx` | **Alterar** — Registar novo conteúdo |
| `supabase/functions/otto-chat/index.ts` | **Alterar** — Corrigir instruções pós-ticket |

