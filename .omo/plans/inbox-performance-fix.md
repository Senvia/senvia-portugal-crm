# inbox-performance-fix - Work Plan

## TL;DR (For humans)

**What you'll get:** O Inbox deixa de travar. Mensagens chegam instantaneamente (push real, não polling). Não há mais cache de mensagens antigas a aparecer primeiro. A interface é fluida mesmo com centenas de conversas.

**Why this approach:** Os travamentos têm 3 causas raiz identificadas no código: (1) React Query serve dados em cache (antigos) antes de fazer refetch — por isso vês mensagens de ontem primeiro; (2) Inbox.tsx tem 5.614 linhas com ~60 useState — cada mensagem nova re-renderiza o componente inteiro; (3) Polling de 3-12s como fallback ao realtime — se o websocket cai, as mensagens demoram a chegar. O plano ataca as 3 causas em ondas independentes.

**What it will NOT do:**
- Não troca Chatwoot por WAHA (isso é uma migração separada)
- Não muda a API do Chatwoot nem as Edge Functions existentes
- Não remove funcionalidades (etiquetas, atribuições, respostas rápidas, etc.)
- Não adiciona testes (projeto não tem suite de testes)

**Effort:** Large
**Risk:** Medium — refactor de um componente de 5.614 linhas tem risco de regressões. Mitigado por `tsc --noEmit` + verificação manual em cada onda.

**Decisions to sanity-check:**
- **Otimização 1 (React Query)**: `staleTime: 0` para mensagens + `placeholderData: keepPreviousData` — pode aumentar requests ao Chatwoot. Alternativa: manter `staleTime` mas usar `initialDataUpdatedAt: Date.now()` para forçar refetch imediato. Vou com `staleTime: 0` porque o realtime já faz invalidate, e o problema é mesmo o cache a servir dados velhos.
- **Otimização 2 (Component split)**: Dividir Inbox.tsx em 5 sub-componentes com `React.memo`. Isto é a mudança mais arriscada — muito código para mover. Mas sem isto, os travamentos continuam.
- **Otimização 3 (Zustand store)**: Reduzir 60 useState para 1 store Zustand. Pode introduzir bugs se algum estado tiver dependências subtis. Mitigado por manter a mesma lógica, só mudando o container.

Your next move: aprovar o plano. Full execution detail follows below.

---

> TL;DR (machine): Large refactor; 3 waves; React Query cache fix + component split + Zustand store; sem migração de backend; 5614 linhas → 5 componentes.

## Scope

### Must have
- **Wave 1 — Cache fix**: Eliminar o problema de "mensagens antigas aparecem primeiro" configurando React Query corretamente
- **Wave 2 — Component split**: Dividir `Inbox.tsx` (5.614 linhas) em 5 sub-componentes memoizados
- **Wave 3 — State management**: Migrar ~60 `useState` para Zustand store para evitar re-renders em cascata
- **Wave 4 — Polling optimization**: Reduzir intervalos de polling e confiar mais no realtime
- **Wave 5 — Virtual list fix**: Garantir que a lista de conversas não re-renderiza todas as rows a cada mensagem

### Must NOT have (guardrails, anti-slop, scope boundaries)
- **Não trocar Chatwoot por WAHA** — isso é um plano separado
- **Não mudar as Edge Functions** — `chatwoot-inbox`, `chatwoot-webhook` ficam como estão
- **Não remover funcionalidades** — etiquetas, atribuições, respostas rápidas, kanban, command palette, atalhos, tudo fica
- **Não adicionar testes** — CLAUDE.md §9 confirma "No tests exist"
- **Não mudar a API do Chatwoot** — as chamadas a `invokeInbox` ficam iguais
- **Não adicionar dependências novas** — usar Zustand que já está no projeto
- **Não refatorar os hooks** — `useChatwootInbox.ts` fica como está (1.587 linhas, 50+ hooks)

## Verification strategy
> Zero human intervention - all verification is agent-executed.
- Test decision: **none** (projeto sem suite de testes). Verificação por:
  1. `npx tsc --noEmit --skipLibCheck` deve sair com `exit 0` (regra do CLAUDE.md §2)
  2. `npm run lint` — 0 erros novos (erros pré-existentes em ficheiros não tocados são aceitáveis)
  3. Vite dev server na :8081 responde 200 e HMR sem erro nos logs
  4. `curl http://127.0.0.1:8081/` retorna HTML
  5. Verificação manual: abrir o Inbox, enviar mensagem, confirmar que chega < 1s
- Evidence: `.omo/evidence/inbox-perf-wave-N-*.log`

## Execution strategy

### Parallel execution waves

**Wave 1 — Cache fix (1 tarefa, isolada)**
- T1: Configurar React Query para não servir cache stale de mensagens

**Wave 2 — Component split (5 tarefas, sequenciais por dependência)**
- T2: Extrair `ConversationList` (lista de conversas com virtualização)
- T3: Extrair `MessageThread` (thread de mensagens com bubbles)
- T4: Extrair `MessageComposer` (composer com emoji, anexos, voz)
- T5: Extrair `ContactPanel` (painel CRM lateral)
- T6: `Inbox.tsx` fica como orquestrador leve (< 500 linhas)

**Wave 3 — State management (1 tarefa)**
- T7: Criar `useInboxStore` (Zustand) e migrar useState

**Wave 4 — Polling + realtime (1 tarefa)**
- T8: Otimizar intervalos de polling e staleTime

**Wave 5 — Virtual list (1 tarefa)**
- T9: Memoizar `ConversationRow` com `React.memo` + comparação shallow

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
| --- | --- | --- | --- |
| T1 cache fix | — | T8 | — |
| T2 ConversationList | — | T6 | T3, T4, T5 |
| T3 MessageThread | — | T6 | T2, T4, T5 |
| T4 MessageComposer | — | T6 | T2, T3, T5 |
| T5 ContactPanel | — | T6 | T2, T3, T4 |
| T6 Inbox orchestrator | T2, T3, T4, T5 | T7 | — |
| T7 Zustand store | T6 | T8, T9 | — |
| T8 Polling optimization | T1, T7 | — | T9 |
| T9 Virtual list memo | T7 | — | T8 |

## Todos

> Implementation + Test = ONE todo. Never separate.

- [ ] 1. Fix React Query cache showing stale messages
  What to do / Must NOT do: Em `useChatwootInbox.ts`, alterar a config de `useInboxMessages`:
  - `staleTime: 0` (em vez de não definido) — força refetch sempre que a query é acedida, não serve cache velho
  - `placeholderData: (prev) => prev` (manter) — não flash para loading enquanto refetch
  - Em `useInboxConversations`: manter `staleTime: 10000` mas adicionar `initialDataUpdatedAt: () => Date.now()` para que o `initialData` do localStorage seja sempre considerado stale
  - Não mudar `refetchInterval` nem `gcTime`
  - Não tocar em `useInboxRealtime`
  References:
    - src/hooks/useChatwootInbox.ts:567-621 (useInboxMessages)
    - src/hooks/useChatwootInbox.ts:473-497 (useInboxConversations)
    - src/hooks/useChatwootInbox.ts:399-419 (loadCachedConversations / saveCachedConversations)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0
  QA scenarios:
    - happy: Abrir conversa → mensagens aparecem frescas (não cache de ontem)
    - failure: Abrir conversa → se Chatwoot estiver lento, mostra loading em vez de mensagens velhas
  Evidence: .omo/evidence/inbox-perf-wave1-tsc.log
  Commit: Y | Fix(inbox): React Query nao serve cache stale de mensagens

- [ ] 2. Extract ConversationList component
  What to do / Must NOT do: Criar `src/components/inbox/ConversationList.tsx` que contém:
  - A lista virtualizada de conversas (atualmente inline em Inbox.tsx ~linhas 3700-4200)
  - Tabs (all/unread/waiting/mine/archived)
  - Search input
  - Pin/mute actions
  - Recebe props: `conversations`, `selectedId`, `onSelect`, `search`, `onSearchChange`, `tab`, `onTabChange`, `pinned`, `muted`, `unreadByInbox`, `caixaFilter`
  - Exportar como `React.memo` com comparação shallow
  - NÃO incluir o `InboxCaixaRail` (esse já é separado)
  References:
    - src/pages/Inbox.tsx:3700-4200 (lista de conversas inline)
    - src/components/inbox/InboxCaixaRail.tsx (já separado, referência de padrão)
    - src/hooks/useChatwootInbox.ts (tipos InboxConversation)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0; componente renderiza a mesma lista
  QA scenarios:
    - happy: Lista renderiza com as mesmas conversas, mesma ordem, mesmas tabs
    - failure: Selecionar conversa continua a funcionar (callback onSelect)
  Evidence: .omo/evidence/inbox-perf-wave2-t2-tsc.log
  Commit: Y | Refactor(inbox): extrair ConversationList component

- [ ] 3. Extract MessageThread component
  What to do / Must NOT do: Criar `src/components/inbox/MessageThread.tsx` que contém:
  - A thread de mensagens com bubbles (atualmente inline em Inbox.tsx ~linhas 4200-4900)
  - Separadores de data (Hoje/Ontem)
  - Marcador de não-lidas
  - Scroll to bottom
  - Load older messages on scroll up
  - Reply/quote rendering
  - Reactions
  - Message delete/edit
  - Recebe props: `messages`, `selected`, `isMobile`, `onReply`, `onReact`, `onDelete`, `onEdit`, `onLoadOlder`, `highlightedWaId`
  - Exportar como `React.memo`
  References:
    - src/pages/Inbox.tsx:4200-4900 (thread de mensagens)
    - src/pages/Inbox.tsx:131-214 (renderWhatsAppFormatting, autolink)
    - src/pages/Inbox.tsx:474-638 (AttachmentView, AudioPlayer, AudioAttachment)
    - src/pages/Inbox.tsx:641-656 (StatusTicks, ListStatusTicks)
    - src/pages/Inbox.tsx:659-695 (ContactAvatar, ReplyButton, ReactionButton)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0
  QA scenarios:
    - happy: Thread renderiza com as mesmas mensagens, mesmo formato, mesmo scroll
    - failure: Reply/reaction/delete continuam a funcionar
  Evidence: .omo/evidence/inbox-perf-wave2-t3-tsc.log
  Commit: Y | Refactor(inbox): extrair MessageThread component

- [ ] 4. Extract MessageComposer component
  What to do / Must NOT do: Criar `src/components/inbox/MessageComposer.tsx` que contém:
  - O composer com contentEditable (atualmente inline em Inbox.tsx ~linhas 4900-5400)
  - Emoji picker
  - Anexos (drag-drop, paste, file picker)
  - Gravação de voz
  - Respostas rápidas (canned responses)
  - Assinatura
  - Agendar mensagem
  - Enviar produtos
  - Recebe props: `draft`, `onDraftChange`, `onSend`, `onSchedule`, `attachments`, `onAttachmentsChange`, `replyTo`, `onReplyDismiss`, `signing`, `onSigningChange`, `cannedResponses`, `contactName`
  - Exportar como `React.memo`
  References:
    - src/pages/Inbox.tsx:4900-5400 (composer)
    - src/pages/Inbox.tsx:417-443 (fileToBase64, attachmentKind)
    - src/components/inbox/EmojiPicker.tsx (já separado)
    - src/components/inbox/InboxProductPicker.tsx (já separado)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0
  QA scenarios:
    - happy: Composer envia mensagem, anexos, voz, emoji
    - failure: Agendar mensagem e enviar produtos continuam a funcionar
  Evidence: .omo/evidence/inbox-perf-wave2-t4-tsc.log
  Commit: Y | Refactor(inbox): extrair MessageComposer component

- [ ] 5. Extract ContactPanel component
  What to do / Must NOT do: Criar `src/components/inbox/ContactPanel.tsx` que contém:
  - O painel CRM lateral (atualmente inline em Inbox.tsx ~linhas 5400-5614)
  - Match de contacto (lead/cliente)
  - Link manual
  - Criar lead/cliente
  - Editar lead/cliente inline
  - Propostas e vendas abertas
  - Notas
  - Galeria (media/docs/links)
  - Tarefas
  - Lembretes
  - Recebe props: `contactMatch`, `crmRecord`, `selected`, `onLinkCrm`, `onCreateLead`, `onCreateClient`, `onEditCrm`, `openProposals`, `openSales`
  - Exportar como `React.memo`
  References:
    - src/pages/Inbox.tsx:5400-5614 (painel CRM)
    - src/components/inbox/ConversationTasks.tsx (já separado)
    - src/components/contacts/ContactNotes.tsx (já separado)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0
  QA scenarios:
    - happy: Painel mostra contacto, propostas, notas, tarefas
    - failure: Link a CRM e criar lead/cliente continuam a funcionar
  Evidence: .omo/evidence/inbox-perf-wave2-t5-tsc.log
  Commit: Y | Refactor(inbox): extrair ContactPanel component

- [ ] 6. Slim down Inbox.tsx to orchestrator
  What to do / Must NOT do: `Inbox.tsx` fica como orquestrador leve (< 500 linhas):
  - Importa e compõe: `ConversationList`, `MessageThread`, `MessageComposer`, `ContactPanel`, `InboxCaixaRail`
  - Mantém o estado que liga os componentes (selectedId, search, tab, etc.)
  - Mantém os hooks de dados (useInboxConversations, useInboxMessages, useInboxRealtime, etc.)
  - Mantém os useEffect de wiring (realtime → invalidate, selectedId → markRead, etc.)
  - Remove toda a lógica de renderização que foi extraída
  - Mantém o keyboard handler global
  References:
    - src/pages/Inbox.tsx (ficheiro completo, 5614 linhas)
    - src/components/inbox/InboxCaixaRail.tsx (padrão de composição)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0; Inbox.tsx < 600 linhas
  QA scenarios:
    - happy: Inbox renderiza com todos os componentes, mesma funcionalidade
    - failure: Nenhuma funcionalidade perdida
  Evidence: .omo/evidence/inbox-perf-wave2-t6-tsc.log
  Commit: Y | Refactor(inbox): Inbox.tsx orquestrador leve

- [ ] 7. Migrate useState to Zustand store
  What to do / Must NOT do: Criar `src/stores/useInboxStore.ts` (Zustand) com:
  - Estado de UI: `selectedId`, `search`, `tab`, `caixaFilter`, `draft`, `panelOpen`, `sheetOpen`, `commandPaletteOpen`, `shortcutsOpen`
  - Estado de composer: `draft`, `outAttachments`, `replyTo`, `highlightedWaId`, `recording`, `pendingVoice`, `plusOpen`, `plusView`, `emojiSearch`, `signing`
  - Estado de mensagens: `pending` (bubbles otimistas), `olderByConv`, `loadingOlder`, `noMoreOlder`, `deletedIds`, `editedContent`
  - Estado de conversas: `pinned`, `muted`, `drafts`
  - Estado de modais: `newConvOpen`, `renameOpen`, `scheduleOpen`, `assignOpen`, `reminderOpen`, `autoReplyOpen`, `galleryOpen`, `tasksModalOpen`, `editCrmOpen`, `linkOpen`, `addToCrmOpen`, `confirm`
  - Actions: `setSelectedId`, `setSearch`, `setTab`, `setDraft`, `togglePanel`, `addPending`, `removePending`, etc.
  - Migrar os ~60 useState do Inbox.tsx para este store
  - NÃO migrar estado que é de hooks (useQuery, useMutation) — esses ficam
  References:
    - src/pages/Inbox.tsx:770-887 (~60 useState)
    - src/stores/useDashboardPeriod.ts (padrão Zustand existente)
    - src/stores/useInboxImmersiveStore.ts (store existente do inbox)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0; Inbox.tsx não tem mais de 10 useState
  QA scenarios:
    - happy: Estado persiste entre componentes, re-renders reduzidos
    - failure: Funcionalidade de modais, drafts, pinned continua a funcionar
  Evidence: .omo/evidence/inbox-perf-wave3-t7-tsc.log
  Commit: Y | Refactor(inbox): migrar useState para Zustand store

- [ ] 8. Optimize polling intervals and staleTime
  What to do / Must NOT do: Em `useChatwootInbox.ts`:
  - `useInboxConversations`: `refetchInterval` quando `live=true` passar de 10000 para 30000 (30s — o realtime já invalida)
  - `useInboxMessages`: `refetchInterval` quando `live=true` passar de 12000 para 30000
  - `useInboxMessages`: `staleTime: 0` (já feito em T1, confirmar)
  - `useInboxUnreadTotal`: `refetchInterval` passar de 20000 para 30000
  - Não mudar os intervalos quando `live=false` (polling de fallback deve continuar rápido)
  References:
    - src/hooks/useChatwootInbox.ts:488 (refetchInterval conversations)
    - src/hooks/useChatwootInbox.ts:613 (refetchInterval messages)
    - src/hooks/useChatwootInbox.ts:558 (refetchInterval unread total)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0
  QA scenarios:
    - happy: Mensagens chegam < 1s com realtime ativo; polling a 30s não causa lag visível
    - failure: Se realtime cai, mensagens continuam a chegar (fallback polling a 3-6s)
  Evidence: .omo/evidence/inbox-perf-wave4-t8-tsc.log
  Commit: Y | Perf(inbox): otimizar polling intervals

- [ ] 9. Memoize ConversationRow with React.memo
  What to do / Must NOT do: Em `ConversationList.tsx` (criado em T2):
  - Extrair o row individual para `ConversationRow` component
  - Envolver com `React.memo` com comparação shallow de props
  - Props a comparar: `conversation` (referência), `isSelected`, `isPinned`, `isMuted`, `unreadCount`, `onClick`
  - A comparação de `conversation` já é otimizada por `stabilize()` em `fetchConversationsMerged` (linhas 459-466) que reusa referências quando nada mudou
  - Garantir que o `onClick` é estável (useCallback no parent)
  References:
    - src/hooks/useChatwootInbox.ts:459-466 (stabilize function)
    - src/pages/Inbox.tsx:3700-4200 (lista de conversas, onde o row está inline)
  Acceptance criteria: `npx tsc --noEmit --skipLibCheck` exit 0; lista não re-renderiza todas as rows a cada mensagem
  QA scenarios:
    - happy: Mensagem nova numa conversa → só essa row re-renderiza
    - failure: Selecionar conversa → apenas a row antiga e a nova re-renderizam
  Evidence: .omo/evidence/inbox-perf-wave5-t9-tsc.log
  Commit: Y | Perf(inbox): memoizar ConversationRow com React.memo

## Final verification wave
> Runs in parallel after ALL todos. ALL must APPROVE.
- [ ] F1. Plan compliance audit — comparar `git diff --stat` com lista de ficheiros esperados; verificar que nenhum Must NOT have foi violado
- [ ] F2. Code quality review — `npx tsc --noEmit --skipLibCheck` exit 0; `npm run lint` 0 erros novos; sem deps novas
- [ ] F3. Real manual QA — abrir `http://localhost:8081/inbox`, enviar mensagem, confirmar < 1s; abrir conversa, confirmar mensagens frescas; scroll na lista, confirmar sem lag
- [ ] F4. Scope fidelity — Chatwoot não foi trocado; Edge Functions não foram mudadas; funcionalidades não foram removidas

## Commit strategy
- 9 commits granulares (um por T1–T9)
- Mensagens em português (convenção CLAUDE.md §Commit convention)
- Co-author: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Branch: `feat/inbox-performance-fix`
- Merge para `main` APENAS após F1–F4 aprovarem e o utilizador der OK

## Success criteria
- Mensagens chegam em < 1s (via realtime push, não polling)
- Abrir uma conversa mostra mensagens frescas (não cache de ontem)
- Lista de conversas não trava ao fazer scroll (virtual list + memo)
- Enviar mensagem não causa re-render de toda a página
- Inbox.tsx < 600 linhas (era 5.614)
- ~10 useState no Inbox.tsx (eram ~60)
- `npx tsc --noEmit --skipLibCheck` exit 0
- `npm run lint` 0 erros novos
- Sem migração de backend, sem novas dependências, sem funcionalidades removidas
