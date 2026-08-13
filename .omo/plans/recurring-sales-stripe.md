# Vendas recorrentes e Stripe por organização

Plano de execução aprovado em `docs/superpowers/plans/2026-08-12-recurring-sales-stripe.md`.
Esse documento é a especificação executável integral; os itens abaixo são as unidades de entrega e os respetivos gates.

## TODOs

- [ ] Tarefa 1 — Fundar o domínio recorrente no PostgreSQL, com testes SQL, RLS, ciclos idempotentes, máquina de estados e tipos.
- [ ] Tarefa 2 — Migrar os dados legados e os hooks sem alterar dinheiro histórico.
- [ ] Tarefa 3 — Implementar Stripe Connect OAuth Standard por organização, incluindo estado de uso único e UI.
- [ ] Tarefa 4 — Sincronizar produtos e preços com Stripe de forma idempotente.
- [ ] Tarefa 5 — Criar vendas recorrentes e Checkout inequivocamente ligado à venda.
- [ ] Tarefa 6 — Processar webhooks Connect e liquidar ciclos pelo valor bruto.
- [ ] Tarefa 7 — Automatizar ciclos manuais e reconciliar eventos Stripe perdidos.
- [ ] Tarefa 8 — Substituir o detalhe antigo pelo painel de recorrência por ciclo.
- [ ] Tarefa 9 — Adicionar classificação e filtros operacionais de vendas ativas.
- [ ] Tarefa 10 — Corrigir métricas e filtros financeiros por competência e recebimento.
- [ ] Tarefa 11 — Auditar e reparar dados reais de forma conservadora e idempotente.
- [ ] Tarefa 12 — Documentar operação, validar ponta a ponta e preparar o handoff da branch.

## Critérios globais de aceitação

- Executar cada tarefa exatamente conforme o plano aprovado e os seus ficheiros, interfaces, testes e cenários manuais.
- Serviço e cobrança têm estados separados; falha de pagamento não desativa o serviço.
- Ciclos, crons, webhooks, Checkout e reparação são idempotentes.
- Associação Stripe usa IDs e metadata; nunca e-mail, nome ou primeira venda.
- Dívida/liquidação usam valor bruto; taxa e líquido ficam separados.
- Preservar alterações locais preexistentes e nunca enviar alterações para `main`.
- Cada DoneClaim exige verificação adversarial independente antes de marcar a tarefa concluída.

## Final Verification Wave

- [ ] Todos os testes SQL/Deno/TypeScript, typecheck, lint aplicável e build passam; falhas preexistentes ficam documentadas.
- [ ] QA manual dos fluxos manual e Stripe, QA visual desktop/móvel e auditoria de três hipóteses de runtime passam com artefactos.
- [ ] As cinco lanes de `review-work` passam no mesmo SHA final e ficam registadas no ledger.
