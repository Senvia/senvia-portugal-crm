# Revisão da Caixa de Entrada (branch Multicanal) — 2026-06-13

Análise completa do inbox: `src/pages/Inbox.tsx` (2870 linhas), `src/hooks/useChatwootInbox.ts` (1166 linhas), hooks de tarefas/notas/canais, Edge Functions `chatwoot-inbox`, `chatwoot-webhook`, `_shared/multicanal.ts` e as 5 migrações do Multicanal. As 3 descobertas críticas foram verificadas diretamente no código (não são falsos alarmes).

**Pontos fortes:** validação de membership no servidor (`authOrgMember`/`authOrgAdmin`) bem feita; optimistic updates com `cancelQueries` + rollback acima da média do projeto.

---

## 🔴 CRÍTICO — Segurança (resolver antes de clientes reais)

### 1. Token do Chatwoot (e outros segredos) legível por qualquer pessoa
- Policy `"Public can verify organization by slug"` com `USING (true)` para `anon, authenticated` em `organizations` (`supabase/migrations/20260116101609_6d10184f-47b5-4ea4-9ed7-a49d42ab5caa.sql:3`).
- RLS é por linha, não por coluna → qualquer pessoa com a anon key (está no bundle) lê `chatwoot_account_token`, `whatsapp_api_key`, `brevo_api_key`, `invoicexpress_api_key` de TODAS as orgs.
- O Multicanal agravou: adicionou `chatwoot_account_token` nessa tabela (`20260611120000_multicanal_messaging_channels.sql:5`).
- **Fix:** tabela `org_secrets` só-service-role (edge functions já usam service role, nada parte), ou `REVOKE SELECT (colunas sensíveis) ON organizations FROM anon, authenticated`.

### 2. `chatwoot-webhook` aceita qualquer POST sem autenticação
- `verify_jwt = false` (`supabase/config.toml:123`); org resolvida só pelo `event.account.id` do corpo (inteiro enumerável).
- Atacante pode: forjar pushes, queimar quota Gemini, e **acionar auto-reply para número arbitrário** — destino vem do payload e o guard `senvia_auto_replied_at` (`chatwoot-webhook/index.ts:219`) também vem do payload (basta omitir).
- **Fix:** segredo por org no URL do webhook (`?key=...` validado em DB) ou assinatura HMAC.

---

## 🟠 ALTA — Bugs funcionais

### 3. Badge da sidebar corrompe a lista de conversas
- `useInboxConversations` (`useChatwootInbox.ts:241`) e `useInboxUnreadTotal` (`:302`) usam a MESMA query key `['inbox-conversations', orgId]` com queryFn diferentes (merge incremental vs fetch simples).
- Quando o badge (global, poll 20s) ganha o refetch, o resultado cru substitui a cache merged → conversas desaparecem.
- **Fix:** extrair uma única queryFn partilhada.

### 4. Microfone/timers sem cleanup no unmount
- `startRecording` (`Inbox.tsx:884-917`): sair da página a gravar deixa a stream do micro ativa + intervals a disparar. Idem `typingResetRef` (`:2255`).
- **Fix:** useEffect de cleanup que pare tracks e limpe timers.

### 5. "Nova Lead" do inbox abre vazia e não associa a conversa
- `AddLeadModal` (`Inbox.tsx:2486`) sem `initialData` nem `onCreated`, ao contrário do `CreateClientModal` (`:2474`). A UI promete «cria a lead com este contacto já ligado».
- **Fix:** passar initialData + ligar `onCreated` → `linkCrm.mutate({ kind: "lead", ... })`.

### 6. God-component + re-render total a cada tecla
- `Inbox.tsx`: 34 useState + 11 useRef + 8 useEffect num só componente. `threadRows` reconstruído no render sem useMemo (`:1561`); `MessageBubble`/`ConversationRow` sem React.memo; `translateActivity` (7 regexes) por linha por render (`:2829`).
- **Fix:** extrair `ConversationList`, `ThreadView`, `Composer` (draft local), `ContactPanel` + dialogs para `src/components/inbox/`; memoizar; considerar virtualização (`@tanstack/react-virtual`).

### 7. Race read-modify-write no `metadata` dos canais
- `useSaveAutoReplyConfig` (`useChatwootInbox.ts:842`) e `useSaveAiTasksEnabled` (`useInboxTasks.ts:238`) fazem SELECT+UPDATE do metadata inteiro — um clobber pode apagar a config do outro (e a config Evolution/Chatwoot do canal).
- **Fix:** RPC com merge atómico `metadata = metadata || $1::jsonb`.

---

## 🟡 MÉDIA

8. **Matching telefone PT-only**: tudo cruzado pelos últimos 9 dígitos (`Inbox.tsx:637`, `useContactMatch`, `useInboxTasks`). Internacionais colidem; canais sem telefone (IG/FB) ficam sem match/tarefas/notas. → E.164 + `contact_id` Chatwoot como chave alternativa.
9. **`LIKE '%sufixo'` sem índice** em 4 queries (`useChatwootInbox.ts:569/575/886`, `useInboxTasks.ts:75`) + dedupe IA no webhook (`chatwoot-webhook/index.ts:62`). `contact_notes` já resolveu com `phone_key` indexado — replicar em `inbox_tasks`/`scheduled_messages`.
10. **Auto-scroll agressivo** (`Inbox.tsx:747`): arrasta para o fundo enquanto o agente lê histórico; sem preservação de scroll no load de antigas. → só scrollar se `isNearBottom`.
11. **Atalhos disparam com dialogs abertos** (`Inbox.tsx:1059`): `e` arquiva, `c` abre modal por cima. → ignorar com `[role=dialog]` aberto.
12. **Realtime/presence públicos** (`useChatwootInbox.ts:120/178`): presence publica `{userId, name, conversationId}` em canal subscritível por qualquer cliente com anon key + UUID da org. → canais privados (Realtime Authorization).
13. **`delete_label`/`delete_canned` para qualquer membro** (`chatwoot-inbox/index.ts:537-574`): ações a nível de conta com `authOrgMember`. → exigir `authOrgAdmin` em create/delete.
14. **`invalidateQueries` dentro da queryFn** de `useWhatsappStatus` (`useMessagingChannels.ts:101`), polled a 4s incondicionalmente. → invalidar só em transição de status.
15. **Invalidações sem org id** (`['inbox-tasks']` em `useChatwootInbox.ts:127`, `['inbox-auto-reply']` `:857`, `['inbox-scheduled']` `:912/925`, `['inbox-ai-tasks-enabled']` `useInboxTasks.ts:267`) → cross-org em utilizadores multi-org.
16. **`as any` em 3 tabelas** (`scheduled_messages`, `inbox_tasks`, `contact_notes`); interfaces manuais já divergem (`reminder_sent` escrito mas não existe no type). → `npx supabase gen types typescript --project-id chhmfwlimtbsyjmgtokn` e derivar de `Tables<...>`.
17. **Webhook sem idempotência** por `message.id` → pushes/Gemini duplicados em reentregas.
18. **`task-reminders` invocável publicamente** (`config.toml:126`, sem segredo de cron). → header `x-cron-secret`.
19. **Poll vs optimistic race** (`useChatwootInbox.ts:85`): refetch a 5s pode completar durante o round-trip da mutação e reverter visualmente o patch. → `useIsMutating` para suspender o intervalo.
20. **Bugs menores confirmados:** beep ao entrar com não-lidas antigas (`Inbox.tsx:511/691`); `onError` do envio sobrescreve draft atual (`:812`); object URLs de áudio nunca revogados ao trocar conversa (`:752`); export gera `++351...` (`:1008`, ignora helper `displayPhone`); pendentes otimistas de outras conversas nunca expiram (`:714-728`); presets de prazo congelados no mount (`ConversationTasks.tsx:123`); cache de transcrições em localStorage keyed só por messageId (colisão entre orgs, `useChatwootInbox.ts:1136`); `markRead` otimista não cobre altIds (`:386`); `useDeleteMessage` sem patch da cache (`:763`).

---

## 🟢 BAIXA — Qualidade

- Helpers duplicados: `waitingLabel`≡`waitingFor`, `firstName` 2×, filtro `"EvolutionAPI"` em 3 sítios, pad datetime-local 3× → `src/lib/inbox-utils.ts`.
- Números mágicos (SLA 15/60min, GROUP_WINDOW 5min, anexo 10MB, polls 2.5–20s, breakpoint 1024 hardcoded) → `INBOX_CONFIG` em constants; breakpoint via `useMediaQuery`.
- `messaging_channels` usa `get_user_org_id` em vez de `is_org_member` (inconsistente com o padrão do projeto, migr. `20260611120000:37`).
- `contact_notes`: sem trigger `updated_at`, INSERT não força `created_by = auth.uid()` (autoria forjável). `inbox_tasks`: UPDATE sem `WITH CHECK` explícito, `created_by`/`assigned_to` sem FK.
- `window.confirm` em ações destrutivas (`Inbox.tsx:1394/1935`) → AlertDialog shadcn. Lightbox sem `DialogTitle` (`:2285`); botões-ícone/emojis sem `aria-label`.
- Chamadas Chatwoot/Evolution/Gemini sem timeout (`_shared/multicanal.ts:146-172`); `corsHeaders`/`json`/`runInBackground` reimplementados em cada função em vez de `_shared/`.
- `InboxUnreadBadge` deixa "(N)" no título do tab ao desmontar; `InboxAlertsWidget` não usa deep-link `?phone=`.
- `translateActivity` por regex no cliente é frágil → traduzir/ocultar no backend.
- Paginação fixa (6 páginas ≈ 300 conversas) e `before` só no thread primário — limites conhecidos, documentar.

---

## Plano de prioridades

1. **JÁ (exploráveis hoje):** #1 segredos na tabela `organizations` + #2 autenticar o webhook.
2. **Esta semana:** #3 query key duplicada, #4 cleanup do micro, #5 lead sem prefill, #7 race do metadata.
3. **Próxima iteração:** #6 decompor o Inbox.tsx (destrava performance e baixa o custo de tudo o resto), #8/#9 matching por `phone_key`/E.164.

**Nota de negócio:** classificador de tarefas e `suggest_reply` enviam conteúdo de conversas WhatsApp de clientes para a Google (Gemini) — confirmar posição RGPD/confidencialidade.
