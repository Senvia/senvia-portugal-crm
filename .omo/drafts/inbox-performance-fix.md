---
slug: inbox-performance-fix
status: awaiting-approval
intent: clear
review_required: false
pending-action: write .omo/plans/inbox-performance-fix.md
approach: 3 ondas de refactor — (1) fix React Query cache que serve mensagens antigas, (2) dividir Inbox.tsx de 5614 linhas em 5 sub-componentes memoizados, (3) migrar 60 useState para Zustand store. Mais 2 ondas de otimização — (4) reduzir polling intervals, (5) memoizar ConversationRow. Sem migrar backend, sem trocar Chatwoot por WAHA.
---

# Draft: inbox-performance-fix

## Components (topology ledger)
| id | outcome | status | evidence path |
| --- | --- | --- | --- |
| cache-fix | staleTime: 0 em useInboxMessages + initialDataUpdatedAt em useInboxConversations | active | src/hooks/useChatwootInbox.ts:567-621, :473-497 |
| conversation-list | ConversationList.tsx extraído de Inbox.tsx com React.memo | active | src/pages/Inbox.tsx:3700-4200 |
| message-thread | MessageThread.tsx extraído de Inbox.tsx com React.memo | active | src/pages/Inbox.tsx:4200-4900 |
| message-composer | MessageComposer.tsx extraído de Inbox.tsx com React.memo | active | src/pages/Inbox.tsx:4900-5400 |
| contact-panel | ContactPanel.tsx extraído de Inbox.tsx com React.memo | active | src/pages/Inbox.tsx:5400-5614 |
| inbox-orchestrator | Inbox.tsx < 600 linhas, só composição + wiring | active | src/pages/Inbox.tsx |
| zustand-store | useInboxStore.ts com ~60 useState migrados | active | src/stores/useInboxStore.ts |
| polling-opt | refetchInterval live=true: 30s (era 10-12s) | active | src/hooks/useChatwootInbox.ts:488,613,558 |
| row-memo | ConversationRow com React.memo + shallow compare | active | src/components/inbox/ConversationList.tsx |

## Open assumptions (announced defaults)
| assumption | default | rationale | reversible? |
| --- | --- | --- | --- |
| staleTime: 0 não causa demasiados requests | O realtime já faz invalidate, staleTime: 0 só impede cache stale | sim |
| Component split não quebra funcionalidades | tsc + verificação manual em cada onda | sim (reverter é trivial) |
| Zustand store não introduz bugs de estado | Mesma lógica, só muda o container | sim |
| Polling a 30s com realtime é suficiente | Realtime push é instantâneo, polling é só safety net | sim |

## Findings (cited - path:lines)
- src/hooks/useChatwootInbox.ts:567-621 — useInboxMessages: sem staleTime definido (default 0 mas initialData pode servir cache), gcTime 5min, refetchInterval 3-12s
- src/hooks/useChatwootInbox.ts:473-497 — useInboxConversations: staleTime 10000, initialData from localStorage com initialDataUpdatedAt: 0 (sempre stale, mas placeholderData mantém cache visível)
- src/hooks/useChatwootInbox.ts:160-302 — useInboxRealtime: Supabase Realtime broadcast channel, debounce 400ms, append + invalidate
- src/hooks/useChatwootInbox.ts:399-419 — loadCachedConversations: localStorage cache para instant paint on reload
- src/hooks/useChatwootInbox.ts:426-467 — fetchConversationsMerged: merge de 2-6 páginas do Chatwoot, stabilize() reusa referências
- src/pages/Inbox.tsx:770-887 — ~60 useState no componente principal
- src/pages/Inbox.tsx:131-214 — renderWhatsAppFormatting, autolink (lógica de renderização de mensagens)
- src/pages/Inbox.tsx:474-638 — AttachmentView, AudioPlayer, AudioAttachment
- src/pages/Inbox.tsx:641-695 — StatusTicks, ContactAvatar, ReplyButton, ReactionButton
- src/pages/Inbox.tsx:3700-4200 — lista de conversas inline (virtualizada)
- src/pages/Inbox.tsx:4200-4900 — thread de mensagens inline
- src/pages/Inbox.tsx:4900-5400 — composer inline
- src/pages/Inbox.tsx:5400-5614 — painel CRM inline

## Decisions (with rationale)
- staleTime: 0 em useInboxMessages — o problema principal é cache a servir mensagens de ontem. staleTime: 0 força refetch sempre. O realtime já faz append + invalidate, por isso o refetch é rápido.
- Não migrar para WAHA — o utilizador perguntou mas o problema não é o backend, é o frontend. WAHA é um plano separado.
- Não refatorar useChatwootInbox.ts — os hooks funcionam, o problema é quem os consome (Inbox.tsx monolítico).
- Zustand em vez de useReducer — Zustand já está no projeto, é mais simples, e permite acesso selectivo ao estado (componentes só re-renderizam quando o slice que observam muda).

## Scope IN
- Fix React Query cache config
- Dividir Inbox.tsx em 5 sub-componentes
- Migrar useState para Zustand
- Otimizar polling intervals
- Memoizar ConversationRow

## Scope OUT (Must NOT have)
- Não trocar Chatwoot por WAHA
- Não mudar Edge Functions
- Não remover funcionalidades
- Não adicionar testes
- Não adicionar dependências novas
- Não refatorar useChatwootInbox.ts

## Open questions
- Nenhuma bloqueante.

## Approval gate
status: awaiting-approval
<!-- Plano apresentado ao utilizador. A aguardar aprovação para escrever o plano final. -->
