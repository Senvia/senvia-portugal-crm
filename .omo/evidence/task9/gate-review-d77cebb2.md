# Tarefa 9 Gate Review — `d77cebb2219bf58f720f997ab4df8d9668eca6d1`

## recommendation

**REJECT / AdversarialVerify: needs-fix (high confidence).**

The committed UI/filter outcome is mostly present and the focused pure tests pass, but the exact Tarefa 9 agent-query acceptance criterion is not implemented. The commit contains no database view/RPC change. Its substitute is an unused frontend helper with `service_status` hard-coded to `active`, and the associated test checks only a plain object produced by another pure helper.

## blockers

1. **violatedCriterion:** `T9-P4` — “Expor vista/RPC documentada que aceita organization_id, product_id e service_status, mantendo RLS.”
   - **observation:** Commit `d77cebb2` adds neither a view nor an RPC. `fetchActivePaidTrafficSales(organizationId, productId)` is a client helper, does not accept `serviceStatus`, hard-codes `.eq("service_status", "active")`, and has no production caller. `buildActivePaidTrafficSalesQuery` likewise accepts only organization/product and is used only by its own unit test.
   - **evidencePointer:** `docs/superpowers/plans/2026-08-12-recurring-sales-stripe.md:528-533`; `d77cebb2:src/hooks/useSales.ts:137-177`; `d77cebb2:src/components/sales/recurring-sales-filter-logic.ts:110-119`; `d77cebb2:src/components/sales/recurring-sales-filter-logic.test.ts:96-102`; `git diff-tree --name-status d77cebb2` (six TS/TSX files, no SQL migration).
   - **requiredFix:** Add and document the RLS-preserving view/RPC specified by the plan, accepting all three inputs (including caller-selected `service_status`), associate products by `sale_items.product_id`, add generated Supabase typing if applicable, and verify authenticated same-org/cross-org behavior plus active/past-due inclusion against the real database interface.

## originalIntent

Classify recurring sales operationally and let users filter the Sales list independently by service status, billing status, billing provider, and recurring product. Agents must be able to query the same organization-scoped dimensions so that all active “Tráfego Pago” sales remain selectable even when billing is past due.

## desiredOutcome

- `useSales` returns recurrence, recurring product IDs, and billing summary.
- Persisted filters select service, billing, provider, and product.
- Recurring rows show monthly amount and separate service/billing badges.
- Product matching uses `sale_items.product_id`, never notes text.
- An explicit documented view/RPC accepts `organization_id`, `product_id`, and `service_status`, preserves RLS, and includes active/past-due services.

## userOutcomeReview

### Confirmed at the exact commit

- The six committed files are clean relative to HEAD despite substantial later concurrent changes elsewhere in the worktree.
- `useSales` scopes sales, recurrences, cycles, and products by the authenticated organization or by IDs originating from its scoped sales; it enriches rows with `recurrence`, `recurring_product_ids`, `recurring_products`, and `billing_summary`.
- The Sales page persists all four requested filters under `sales-recurring-filters-v1` and applies them together with existing search/status/type/date filters.
- The list renders service/billing/provider badges and monthly amount only when `sale.recurrence` exists.
- Product filtering consumes `sale_items.product_id`-derived `recurring_product_ids`; notes are not consulted.
- Active service and billing state are separate. The focused predicate test proves an active/past-due fixture survives `serviceStatus=active`, while an inactive fixture does not.

### Not delivered

- There is no documented database view/RPC for agent consumption with the three required inputs. The pre-existing `public.sales_with_recurrence` view at `supabase/migrations/20260812121000_recurring_sales_compatibility.sql:201-254` is RLS/membership constrained, but it predates this commit, has no product association, and is not the required parameterized product/status interface.
- No test exercises the real `fetchActivePaidTrafficSales` Supabase calls, a real view/RPC, authenticated organization isolation, or cross-tenant rejection.

## direct programming and remove-ai-slops pass

### Production-code findings

- `buildActivePaidTrafficSalesQuery` and `isActivePaidTrafficSale` have no production caller; `fetchActivePaidTrafficSales` also has no caller. These are speculative/pass-through seams created around the missing RPC rather than proof of the required interface.
- `src/hooks/useSales.ts` is 419 pure LOC at the reviewed commit and `src/pages/Sales.tsx` is 591 pure LOC. Tarefa 9 adds about 208 lines to the former and 75 to the latter. This creates maintenance burden under the 250-LOC programming/slop criterion, but the approved task explicitly names both files and does not make module size an acceptance criterion, so this is a NOTE rather than a blocker.
- Database status strings are normalized with silent fallbacks (`unknown service -> pending`, `unknown billing -> not_started`, etc.) rather than being parsed into a typed failure at the boundary. The task’s new predicate/types are strict enough for the named filter scenarios, but malformed persisted/DB state is not behaviorally locked. NOTE, not tied to a stated Tarefa 9 acceptance failure.
- Persisted filter state is asserted as `RecurringSalesFilterState` by the generic persistence hook without runtime parsing. A stale partial object can make `hasRecurringSalesFilter` true and then reject every row. This was probed as stale-state risk; no named Tarefa 9 scenario requires recovery from corrupted local storage, so it is a NOTE.

### Test overfit/slop findings

- The first four pure predicate tests cover meaningful observable classes (active vs inactive, past-due vs current, Stripe vs manual, matching vs nonmatching product ID).
- The fifth test is implementation-mirroring/overfit: it deep-equals the literal object returned by `buildActivePaidTrafficSalesQuery`. It cannot fail when the Supabase helper omits RLS semantics, when no RPC exists, or when cross-organization access is possible. It provides false confidence for `T9-P4`.
- `manual-qa-harness.mjs` is not manual/browser/component QA. It duplicates label strings, synthesizes “visibleBadges” itself, and proves responsive behavior by searching source text for a CSS class. It never renders `Sales.tsx`, never operates the select controls, and never observes badges. Its PASS output is therefore misleading success evidence, though UI presence was independently confirmed by committed-source inspection.
- Missing behavioral coverage: real `useSales` enrichment, billing aggregation, fetch/query integration, RLS/cross-tenant behavior, combined/cleared filters, non-recurring rows under active filters, stale persisted product/filter state, and actual rendered badge/select interaction.
- No deletion-only, requested-removal, prose-pin, snapshot, or output-derived expected-value tests were found.

## reproduced checks

- `git rev-parse HEAD` -> exact SHA `d77cebb2219bf58f720f997ab4df8d9668eca6d1`.
- `git status --short -- <six Tarefa 9 files>` -> no output; later dirty files are outside this commit review.
- `git diff-tree --name-status -r d77cebb2` -> exactly six TS/TSX files; no SQL/view/RPC artifact.
- `git diff-tree --check d77cebb2^ d77cebb2` -> exit 0.
- `node --experimental-strip-types src/components/sales/recurring-sales-filter-logic.test.ts` -> 5 passed, 0 failed.
- `node node_modules/typescript/bin/tsc --noEmit --skipLibCheck` -> exit 0 in the current worktree. Because unrelated later files are dirty/untracked, this is supporting rather than commit-isolated evidence; executor artifact `.omo/evidence/task9/tsc-final.txt` also records exit 0.
- Direct committed-tree search found no Tarefa 9 SQL interface and no production caller for the three query helpers.

## checked artifact paths

- Approved executable plan: `docs/superpowers/plans/2026-08-12-recurring-sales-stripe.md:504-544`
- Approved design: `docs/superpowers/specs/2026-08-12-recurring-sales-stripe-design.md:202-213`
- Commit/diff: `d77cebb2219bf58f720f997ab4df8d9668eca6d1` and its six committed blobs
- Existing compatibility view: `supabase/migrations/20260812121000_recurring_sales_compatibility.sql:201-254`
- Evidence directory: `.omo/evidence/task9/`
- Focused test output: `.omo/evidence/task9/green-filter-tests-final.txt`
- Typecheck: `.omo/evidence/task9/tsc-final.txt`
- Build: `.omo/evidence/task9/build.txt`
- Manual harness/output: `.omo/evidence/task9/manual-qa-harness.mjs`, `.omo/evidence/task9/manual-qa-final.txt`
- Cleanup receipt: `.omo/evidence/task9/cleanup.txt`
- Programming checker evidence: `.omo/evidence/task9/no-excuse-official-final.txt`, `.omo/evidence/task9/no-excuse-official-new-final.txt`

## exact evidence gaps

- No executor validation summary/DoneClaim tied to SHA `d77cebb2` was present.
- No code-review report was present. Consequently there is no report-level confirmation of the programming and remove-ai-slops/overfit criteria; this gate performed that pass directly.
- No manual QA matrix or browser screenshot/component-render artifact was present; only a deterministic source-text/pure-function harness exists.
- No notepad path/artifact for Tarefa 9 was present.
- No database migration, view/RPC definition, generated API type, SQL test, or runtime database output supports `T9-P4`.
- No cross-organization or RLS runtime evidence exists for the purported agent query.

## adversarial classes

- **malformed input:** parse helpers fall back to `all`; persisted-object and database status boundaries are not runtime parsed.
- **stale state:** stale partial persisted filters can reject all rows; stale product IDs remain active but absent from the available product options.
- **dirty worktree:** review bound to exact commit blobs; all six committed task files are clean, unrelated later changes ignored.
- **misleading success:** the object-builder test and static manual harness do not prove the required RPC/RLS or rendered UI.
- **active paid traffic:** pure behavior confirmed for active/past-due inclusion and inactive exclusion; real agent interface absent.
- **organization isolation:** normal `useSales` queries are organization-scoped; purported agent-query isolation is not database-tested.
- **flaky/hung commands:** focused tests and typecheck were bounded and completed; no timing dependence observed.
- **cleanup:** review started no server and created no temporary runtime resource; only this mandated report artifact was written.
