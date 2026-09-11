# Correções A07, A15, A16 e A20

## Alterações locais

- Onze jobs exigem POST e uma credencial interna validada antes de consultar dados de negócio: check-reminders, process-automation-queue, notify-new-trials, check-trial-status, check-fidelization-alerts, meta-capi-purchase, generate-recurring-expenses, check-renewal-automations, process-scheduled-campaigns, trial-inactivity-check e task-reminders.
- `_shared/internal-auth.ts` aceita a chave de serviço configurada ou o segredo confirmado por `verify_automation_secret`. Aceita o cabeçalho `x-automation-secret` e o Bearer legado produzido por `internal_service_key()`. Tokens comuns, anon, credenciais incorretas e erros de verificação são recusados.
- `claim_automation_queue` faz a seleção e a transição pending → processing na mesma operação SQL, com `FOR UPDATE SKIP LOCKED`. Apenas service_role executa a RPC. Itens processing/failed não voltam automaticamente à fila, pois um erro de rede não permite concluir que a mensagem não foi entregue. A atualização final verifica erros.
- A migração preserva os horários dos jobs encontrados em `cron.job` e muda as chamadas correspondentes para o segredo do Vault. Não cria horários inexistentes. Os três jobs antes sem configuração explícita passaram a `verify_jwt=false`, com autenticação no handler.
- Brevo falha fechado sem `BREVO_WEBHOOK_SECRET`, rejeita segredo incorreto e aceita eventos somente por POST.
- Otto e Otto legado exigem identidade e organização autorizadas antes de chamar IA. Ambos partilham quotas persistentes: 20 pedidos/utilizador/minuto e 300 pedidos/organização/dia. Erros do banco bloqueiam a chamada paga. Histórico: até 40 mensagens user/assistant, 8000 caracteres por mensagem, 5 anexos e corpo de 64 KiB.
- Prospecção exige MFA aplicável, membership ativa, módulo prospects habilitado e `has_module_permission` para criação de leads. Quotas: 3 pedidos/utilizador/hora e 10 pedidos/organização/dia. Máximo de 3 pesquisas/URLs, 50 resultados por pesquisa, 50 enriquecimentos e 10 perguntas; corpo de 16 KiB. URLs de partida restritas a Google Maps HTTPS. A criação do job remoto tem timeout de 30 segundos.
- O teste manual de automation-engine usa `is_org_admin(user, organização do fluxo)` e MFA, em vez do papel admin global.
- Removidos dos logs os payloads e campos pessoais diretos de submit-lead, argumentos de ferramentas Otto, conteúdo das notificações check-reminders, emails/nomes nos eventos de trial e corpos de erro do fornecedor em caminhos editados.
- Nenhuma alteração em store-api/loja. Nenhum deploy, cron remoto ou envio real executado.

## Evidências reproduzíveis

`node --test scripts/security-edge-jobs.test.cjs`: **54 testes passaram**. Os 37 testes iniciais de jobs/Brevo falharam antes das correções; os jobs irmãos trial-inactivity-check e task-reminders também foram reproduzidos antes de proteger seus handlers. O conjunto inclui requisições reais Request/Response com banco/provedores simulados, autorização de serviço e Vault, ausência/erro de quotas, limites de entrada, recusa antes de chamada paga e fixture de dados pessoais ausente dos logs.

`node scripts/security-queue.test.mjs`: passou em PostgreSQL embutido PGlite, aplicando a migração real. Verifica ACL de clientes, seleção apenas de itens vencidos, transição para processing e ausência de nova entrega dos itens já reclamados/failed. PGlite usa uma conexão: este ensaio não comprova concorrência entre duas transações.

`deno check --node-modules-dir=none` passou nos três helpers novos e nos handlers generate-prospects, automation-engine, otto-chat, check-reminders, process-automation-queue, notify-new-trials, check-trial-status, meta-capi-purchase, generate-recurring-expenses, brevo-webhook, submit-lead, trial-inactivity-check e task-reminders.

A verificação mais ampla reporta erros em trechos não alterados de check-fidelization-alerts (nulabilidade/chamadas de email), check-renewal-automations (casts de relacionamentos), process-scheduled-campaigns (inferência do cliente/relacionamentos/nulabilidade) e otto/lib/tools/write.ts (tipo dos perfis). Isso limita a afirmação de validação global das Edge Functions. LSP não está instalado; o verificador Deno foi usado diretamente.

## Requisitos para publicação e validação real

1. Aplicar as migrações de autorização/permissões e a migração `20260911120000_security_jobs.sql`. Confirmar a revogação de escrita cliente em automation_queue feita pela migração de autorização paralela.
2. Verificar que Vault contém automation_internal_secret e que service_role executa verify_automation_secret e rate_limit_check. Configurar BREVO_WEBHOOK_SECRET e a mesma credencial no provedor antes de publicar o webhook.
3. Publicar handlers e configuração em conjunto. Schedulers externos aos crons versionados devem passar credencial interna; chamadas antigas com anon deixam de funcionar intencionalmente. task-reminders passa a usar o mesmo contrato interno, substituindo o CRON_SECRET opcional.
4. Em staging, com destinatários fictícios, executar dois consumidores simultâneos de claim_automation_queue e comprovar IDs disjuntos. Simular resposta perdida após envio: manter processing para conciliação; não recolocar em pending sem confirmar a entrega no provedor.
5. Confirmar horários/corpos dos crons efetivamente instalados e chamar cada job com credencial correta. Os ensaios locais não enviaram emails, notificações ou eventos Meta.
6. Validar os limites com os planos comerciais, custos reais dos provedores e uso esperado; estes limites são tetos locais explícitos, não uma quota monetária reconciliada com o provedor.
7. Verificar retenção e permissões dos logs na plataforma e registros históricos: remover logs do código não elimina logs antigos nem prova que outros módulos nunca registrem dados pessoais.
