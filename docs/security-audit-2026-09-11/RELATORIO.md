# Auditoria de segurança — Senvia OS

Data: 11/09/2026. Base: d837194f310d7421c7ce9dd52ebbe372361ddfd6, incluindo a árvore de trabalho local. Alterações pré-existentes preservadas.

**Resultado: encontrados riscos críticos e altos. O projeto não deve ser considerado aprovado em segurança antes de corrigir os achados e validar o ambiente implantado.** Não foi recolhida evidência de intrusão efetiva: identificar vulnerabilidade não prova que já tenha sido explorada.

## Escopo e limites

Auditoria local do CRM, SQL/RLS, funções Supabase, extensão Chrome, gateway de e-mail, configuração e dependências. Inventário: 1.315 arquivos versionados, 353 migrations e 73 diretórios de funções. Foram calculados hashes de 1.254 arquivos textuais. **Inventário e triagem não equivalem à leitura manual de todas as linhas.** A revisão aprofundada concentrou-se nos fluxos e evidências citados neste relatório.

Foram executados 12 ensaios locais com funções extraídas do código, dados fictícios e dependências simuladas, além de npm audit nos três pacotes. Não foram feitos envios, cobranças, mudanças no banco real, testes de carga ou exploração em produção. Os mocks comprovam decisões do código, não ACLs efetivas, execução SQL real nem controles externos.

Os cinco revisores paralelos foram interrompidos por limite de utilização antes de entregar pareceres completos. Essas revisões são INCONCLUSIVAS e não contam como aprovação independente. Os achados abaixo foram examinados diretamente na sessão principal.

## Resumo dos 20 achados

| ID | Gravidade | Problema |
|---|---|---|
| A01 | Crítica | RPCs de pesquisa sem autorização entre organizações |
| A02 | Alta | HTML de e-mail entra no editor sem sanitização |
| A03 | Alta | Admin global confundido com admin da organização |
| A04 | Alta | Escritas no banco sem conferir permissão do perfil |
| A05 | Alta | Comandos de e-mail aceitam IDs de outras caixas |
| A06 | Alta | Autenticação da loja contornável e telefone substituível |
| A07 | Alta | Jobs privilegiados sem autenticação de serviço |
| A08 | Alta | MFA na interface sem enforcement correspondente no backend |
| A09 | Alta | Admin local altera identidade global de membros |
| A10 | Alta | Fallback de organização permite acesso residual |
| A11 | Alta | RPC de comissões escreve sem autorizar chamador |
| A12 | Alta | Destinos de rede controláveis e downloads sem limites |
| A13 | Alta | Dependências com avisos públicos de segurança |
| A14 | Alta condicionada | Migração restaura grants amplos |
| A15 | Alta condicionada | Brevo aceita eventos quando o segredo está ausente |
| A16 | Média | Quotas insuficientes em IA/prospecção |
| A17 | Média | CSV preserva prefixos de fórmulas |
| A18 | Baixa | Health expõe metadados de caixas |
| A19 | Baixa | Cabeçalhos de defesa não versionados |
| A20 | Média | Dados pessoais e conteúdo sensível em logs |

Gravidade qualitativa para priorização, não CVSS calculado. “Condicionada” exige confirmar a configuração/ordem de execução indicada. Os achados SQL pressupõem que as definições versionadas estejam implantadas com os privilégios aplicáveis.

## A01 — Crítica: RPCs de pesquisa contornam isolamento entre organizações

**Evidências:** [supabase/migrations/20260223144451_b52c6dec-2ff3-4224-86ac-05011977ac0d.sql:12](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260223144451_b52c6dec-2ff3-4224-86ac-05011977ac0d.sql:12>); [supabase/migrations/20260223145754_c0388fd0-578c-4f88-84df-235165571122.sql:1](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260223145754_c0388fd0-578c-4f88-84df-235165571122.sql:1>); [supabase/migrations/20260307132400_00b384ab-c279-4df7-9e3f-f36cbc440c2b.sql:1](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260307132400_00b384ab-c279-4df7-9e3f-f36cbc440c2b.sql:1>).

**Problema:** as seis funções search_*_unaccent de clientes, leads, faturas, vendas, propostas e notas de crédito são SECURITY DEFINER, retornam linhas completas e confiam no org_id recebido. Não conferem auth.uid(), pertença ou permissão. Não encontrei redefinição posterior nem revogação específica nas migrations. search_organizations_by_name também é definer e pode revelar IDs úteis para encadear consultas.

**Impacto:** com EXECUTE disponível ao papel da API, consultar dados pessoais/comerciais/financeiros de outro tenant apesar do RLS das tabelas. Pesquisa vazia amplia resultados e max_results é controlável. A exposição anónima depende das ACLs efetivas; funções PostgreSQL concedem EXECUTE a PUBLIC por omissão.

**Correção:** revogar EXECUTE de RPCs internas; nas necessárias ao cliente, usar SECURITY INVOKER/RLS ou validar explicitamente utilizador, organização e permissão. Limitar colunas e paginação.

**Validação/limite:** revisão SQL e busca de correções posteriores, sem executar contra dados reais. Em staging, testar anon e contas A/B contra cada organização e consultar has_function_privilege de cada assinatura. Confiança alta no código, deployment pendente.

## A02 — Alta: HTML não confiável no editor de resposta/encaminhamento

**Evidências:** [src/components/email/EmailComposer.tsx:38](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/src/components/email/EmailComposer.tsx:38>); [src/components/email/EmailComposer.tsx:297](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/src/components/email/EmailComposer.tsx:297>); [email-gateway/src/sync.js:73](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/email-gateway/src/sync.js:73>).

**Problema:** o leitor usa iframe protegido, mas quoteHtml insere original.html_body diretamente no conteúdo citado; nome/endereço do remetente também não são integralmente escapados. EmailComposer atribui o resultado a innerHTML no documento principal. Não foi encontrado sanitizador nesse caminho.

**Impacto:** e-mail externo preparado pode executar um handler de evento quando a vítima responde/reencaminha, com acesso ao contexto do CRM. Isso pode permitir ações com a sessão da vítima e leitura de dados acessíveis ao JavaScript. Há também carregamento de recursos remotos do conteúdo citado.

**Correção:** sanitizador HTML mantido, allowlist restritiva e escape dos campos textuais; remover handlers, URLs perigosas e conteúdo ativo. Aplicar a rascunhos e assinaturas. Não confiar no sandbox do leitor para proteger o editor.

**Validação/limite:** a função real preservou onerror na fixture sintética. A revisão automática bloqueou a abertura da fixture no navegador por limite de utilização; não foi observada execução e não se tentou contornar o bloqueio. Testar reply/reply-all/forward/rascunhos após correção.

## A03 — Alta: admin de A recebe poderes indevidos em B

**Evidências:** [supabase/functions/otto/lib/context.ts:69](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/otto/lib/context.ts:69>); [supabase/functions/otto/lib/tools/registry.ts:25](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/otto/lib/tools/registry.ts:25>); [supabase/migrations/20260813120000_email_segredos_e_acesso_por_caixa.sql:95](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260813120000_email_segredos_e_acesso_por_caixa.sql:95>); [supabase/migrations/20260807100000_automation_flows.sql:174](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260807100000_automation_flows.sql:174>).

**Problema:** o Otto valida pertença ativa à organização, mas resolve admin na tabela global user_roles. canUseTool libera todas as ferramentas para esse sinal. O padrão aparece também em pode_aceder_caixa e políticas de automações. A correção de julho reconhece o problema, mas só cobre parte dos locais.

**Impacto:** admin de A que é viewer/membro de B pode ganhar ferramentas administrativas Otto em B, consultar caixas restritas e alterar automações de B conforme as políticas citadas. Não dá acesso a uma organização da qual nunca foi membro.

**Correção:** obter role por organization_members com organization_id/is_active; reservar bypass global a super_admin. Trocar verificações de admin global por is_org_admin em políticas e funções.

**Validação:** ensaio real de loadContext com serviços simulados retornou effectiveAdmin=true para viewer de B com admin global. Testar matriz A-admin/B-viewer e perfis de caixas/automações.

## A04 — Alta: RLS de escrita não aplica permissões do perfil

**Evidências:** [supabase/migrations/20260107164052_8f035175-4d4f-4623-bd5f-c93d31f5ccd2.sql:178](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260107164052_8f035175-4d4f-4623-bd5f-c93d31f5ccd2.sql:178>); [supabase/migrations/20260107164052_8f035175-4d4f-4623-bd5f-c93d31f5ccd2.sql:192](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260107164052_8f035175-4d4f-4623-bd5f-c93d31f5ccd2.sql:192>); [supabase/migrations/20260115123747_f5d58a5a-eeb2-4843-9df4-6a77a83c5207.sql:41](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260115123747_f5d58a5a-eeb2-4843-9df4-6a77a83c5207.sql:41>).

**Problema/impacto:** estas políticas só conferem a organização, sem autorização de create/edit/delete do perfil. Um utilizador impedido pela interface pode escrever pela API. INSERT de leads e UPDATE de clientes são exemplos. Alterar/apagar uma linha específica também depende das políticas SELECT e triggers aplicáveis.

**Correção:** validar no banco pertença ativa, permissão por ação e propriedade/atribuição quando exigida. Testar chamadas REST de viewer e perfis sem escrita, sem depender de botões ocultos. Confiança alta nas políticas citadas; regras remotas adicionais não auditadas.

## A05 — Alta: comandos de e-mail aceitam IDs de outras caixas

**Evidências:** [supabase/migrations/20260813120000_email_segredos_e_acesso_por_caixa.sql:133](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260813120000_email_segredos_e_acesso_por_caixa.sql:133>); [email-gateway/src/commands.js:18](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/email-gateway/src/commands.js:18>); [email-gateway/src/commands.js:179](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/email-gateway/src/commands.js:179>).

**Problema:** RLS valida channel_id do comando, mas não IDs em payload. O worker resolve messageId, folderId, targetFolderId e attachmentId sem os vincular a cmd.channel_id. Usa a ligação IMAP da caixa do comando e atualiza registos pelos IDs recebidos.

**Impacto:** escritas em registos de outra caixa, flags/contagens incorretas e operações sobre mensagens erradas quando caminhos e UIDs coincidirem. Não foi comprovada extração de emails reais. O ensaio demonstrou aceitação de foreign-message num comando own-channel.

**Correção:** vincular todas as referências a channel_id/organization_id no worker e conferir acesso atual do autor antes de executar. Rejeitar incoerências antes de qualquer IMAP/SQL; usar constraints/validação transacional onde possível.

**Validação:** testar mensagens, pastas e anexos de outra caixa da mesma organização e de outro tenant. No mock, o despacho de mark_read aceitou uma mensagem de foreign-channel.

## A06 — Alta: autenticação da loja contornável

**Evidências:** [supabase/functions/store-api/index.ts:536](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/store-api/index.ts:536>); [supabase/functions/store-api/index.ts:547](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/store-api/index.ts:547>); [supabase/functions/store-api/index.ts:338](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/store-api/index.ts:338>); [supabase/functions/store-api/index.ts:497](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/store-api/index.ts:497>).

**Problema:** orders só verifica os últimos quatro dígitos do telefone quando recebe email; fornecer customer_id salta essa validação. O checkout público encontra clientes por email e substitui name/phone sem provar titularidade. O login usa precisamente o sufixo desse telefone e não cria sessão autenticada vinculada às consultas posteriores.

**Impacto:** customer_id conhecido permite ler histórico de encomendas. Email conhecido e carrinho válido permitem substituir o telefone e usar o sufixo escolhido para se identificar como o cliente. A alteração ocorre antes de operações posteriores e não é desfeita por falha posterior.

**Correção:** OTP/magic link ou autenticação equivalente; sessão verificável e customer_id derivado no servidor. Checkout de visitante deve guardar dados na encomenda, sem sobrescrever identidade existente. Quatro dígitos de telefone não são credencial adequada.

**Validação:** dois ensaios reproduzidos: consulta por ID retornou encomenda sem verificação; checkout alterou telefone, parou antes de criar encomenda e login aceitou o novo sufixo. Tudo com dados/serviços fictícios. Repetir em staging com contas de teste.

## A07 — Alta: jobs privilegiados sem autorização de serviço

**Evidências:** [supabase/config.toml:27](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/config.toml:27>); [supabase/functions/check-reminders/index.ts:8](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/check-reminders/index.ts:8>); [supabase/functions/process-automation-queue/index.ts:9](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/process-automation-queue/index.ts:9>); [supabase/functions/notify-new-trials/index.ts:21](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/notify-new-trials/index.ts:21>); [supabase/functions/check-trial-status/index.ts:16](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/check-trial-status/index.ts:16>); [supabase/functions/check-fidelization-alerts/index.ts:208](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/check-fidelization-alerts/index.ts:208>); [supabase/functions/meta-capi-purchase/index.ts:17](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/meta-capi-purchase/index.ts:17>).

**Problema:** os seis handlers citados estão com verify_jwt=false e não autenticam o chamador antes de usar service_role. generate-recurring-expenses também não tem autorização interna; JWT padrão, quando ativo, não prova que o chamador seja um cron. A fila de automações lê pending e só atualiza depois do envio, sem claim atómico.

**Impacto:** processamento global, notificações, alterações e carga de banco acionáveis externamente. Chamadas concorrentes podem duplicar processamento. meta-capi-purchase permite alterar a marca de envio de venda conhecida. Não afirmo envio bem-sucedido de Purchase: meta-capi-event atualmente recusa esse nome de evento.

**Correção:** autenticação obrigatória e fail-closed de serviço com segredo dedicado/verificação criptográfica, mais métodos permitidos e rate limit. Claim transacional e idempotência por evento para as filas.

**Validação:** cinco handlers chegaram ao banco privilegiado com Request sem Authorization e responderam 200 em cenário vazio simulado. Testar anon, sessão comum e segredo incorreto em staging; todos devem falhar antes de ler/escrever. Testar concorrência controlada, sem destinatários reais.

## A08 — Alta: MFA não imposto no backend examinado

**Evidências:** [src/contexts/AuthContext.tsx:89](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/src/contexts/AuthContext.tsx:89>); [src/components/auth/ProtectedLayoutRoute.tsx:37](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/src/components/auth/ProtectedLayoutRoute.tsx:37>); [supabase/functions/_shared/multicanal.ts:74](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/_shared/multicanal.ts:74>).

**Problema:** o frontend distingue aal1/aal2 e apresenta o desafio. Não foi encontrado enforcement aal/aal2 nas migrations/funções. getUser e pertença/role não comprovam segundo fator.

**Impacto:** uma conta com MFA pode receber JWT aal1 após primeira etapa e alcançar diretamente dados/ações que só a UI bloqueia, se não existirem controles externos adicionais.

**Correção:** regras restritivas no banco e verificação do nível nas funções sensíveis, compatíveis com a política de MFA opcional/obrigatório escolhida. Não bloquear acidentalmente contas ainda não inscritas.

**Validação/limite:** comparar JWT aal1/aal2 da mesma conta em REST/Edge Functions. Configuração remota não consultada. A documentação Supabase exige enforcement além da interface.

## A09 — Alta: admin local controla a conta global de membros

**Evidências:** [supabase/functions/manage-team-member/index.ts:240](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/manage-team-member/index.ts:240>); [supabase/functions/manage-team-member/index.ts:318](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/manage-team-member/index.ts:318>); [supabase/functions/manage-team-member/index.ts:413](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/manage-team-member/index.ts:413>).

**Problema:** depois de validar administração numa organização partilhada, a função permite mudar password global, banir globalmente e remover roles globais. Os efeitos não ficam restritos à membership local.

**Impacto:** admin de A pode afetar acesso do membro em B/C. Se a vítima também administra B, escolher a sua password cria caminho de tomada de conta, sujeito ao MFA/autenticação efetivos. Banir/remover em A pode bloquear toda a identidade. Não foi feito reset real.

**Correção:** separar administração de memberships e de identidades. Admin local gere apenas vínculo local; recuperação de password deve ir ao titular, sem permitir ao admin escolher a nova password. Reservar ações globais a fluxos próprios autorizados.

**Validação:** membro de A/admin de B e alvo super_admin; admin de A não deve alterar password, ban global ou privilégios globais.

## A10 — Alta: fallback de organização mantém autorização residual

**Evidências:** [supabase/migrations/20260309154707_8d9d73d9-6a4d-40de-b2a4-84d9aa5bf95b.sql:43](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260309154707_8d9d73d9-6a4d-40de-b2a4-84d9aa5bf95b.sql:43>); [supabase/functions/manage-team-member/index.ts:371](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/manage-team-member/index.ts:371>); [supabase/migrations/20260723122000_critical_rls_hardening.sql:63](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260723122000_critical_rls_hardening.sql:63>).

**Problema:** sem membership ativa, get_user_org_id retorna profiles.organization_id sem validar atividade. toggle_status deixa a coluna preenchida. delete_member tenta limpá-la sem bypass exigido pelo trigger e ignora o erro dessa atualização.

**Impacto:** enquanto um JWT continuar aceito pelo banco, políticas baseadas no fallback podem autorizar acesso à organização antiga. Ban na camada Auth não substitui autorização por pedido REST.

**Correção:** remover o fallback não autorizado/exigir membership ativa; tratar erros e atualizar vínculo/perfil numa operação transacional controlada.

**Validação/limite:** em staging, desativar/remover a única membership e repetir REST com JWT previamente emitido. Esperar NULL/negação. Código SQL confirmado; validade de sessões reais não testada.

## A11 — Alta: RPC de comissões escreve sem autorização

**Evidências:** [supabase/migrations/20260907140000_tier_basis_on_product.sql:9](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260907140000_tier_basis_on_product.sql:9>); [supabase/migrations/20260907140000_tier_basis_on_product.sql:76](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260907140000_tier_basis_on_product.sql:76>).

**Problema:** última definição de generate_sale_commission_splits é SECURITY DEFINER, aceita p_sale_id, elimina/recalcula splits e altera dados financeiros sem autorizar o chamador para a venda. Não foi encontrada revogação específica de EXECUTE.

**Impacto:** com EXECUTE disponível, provocar recálculo/escrita em vendas de outro tenant, observar retorno financeiro e gerar carga. Não permite escolher livremente o valor da comissão; o risco é invocação privilegiada indevida.

**Correção:** revogar EXECUTE dos clientes se interna aos triggers; se necessária externamente, wrapper com autorização financeira por organização e núcleo privado.

**Validação:** conferir grants da assinatura uuid; anon e outra organização devem falhar antes de DELETE/UPDATE e triggers legítimos devem continuar funcionando. Nenhuma execução SQL real feita.

## A12 — Alta: destinos de rede controláveis e downloads ilimitados

**Evidências:** [supabase/functions/transcribe-audio/index.ts:18](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/transcribe-audio/index.ts:18>); [supabase/functions/transcribe-audio/index.ts:25](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/transcribe-audio/index.ts:25>); [supabase/functions/email-inbox/index.ts:80](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/email-inbox/index.ts:80>); [email-gateway/src/caixas.js:55](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/email-gateway/src/caixas.js:55>); [email-gateway/src/caixas.js:70](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/email-gateway/src/caixas.js:70>).

**Problema:** transcribe-audio exige só prefixo HTTPS, segue redirects por omissão e descarrega o corpo inteiro sem allowlist, timeout ou limite de bytes. Admins de tenants controlam host/porta IMAP/SMTP; o gateway abre essas ligações. Não foi encontrado bloqueio de redes privadas nesses caminhos.

**Impacto:** tentativas de acesso a loopback/serviços internos conforme conectividade do ambiente; consumo excessivo de memória, banda e transcrição. Alcance interno e exfiltração reais não foram comprovados.

**Correção:** receber ID de anexo autorizado e resolver destino no servidor; restringir hosts, IPs/IPv6 e cada redirect, com limites em streaming e timeout. No gateway, egress firewall e bloqueio de redes especiais salvo destinos explicitamente autorizados.

**Validação:** o handler tentou fetch de HTTPS loopback no mock, sem abrir socket. Testar redirects/DNS/rede privada em laboratório. Não foram feitos pedidos a serviços internos reais.

## A13 — Alta: dependências com avisos públicos

**Evidências:** [package.json:87](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/package.json:87>); [package.json:7](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/package.json:7>); [email-gateway/package.json:18](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/email-gateway/package.json:18>); [chrome-extension/package.json:24](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/chrome-extension/package.json:24>); relatórios npm anexos.

| Pacote | Altas | Moderadas | Baixas | Total sinalizado |
|---|---:|---:|---:|---:|
| Raiz | 34 | 52 | 7 | 93 |
| Gateway de e-mail | 16 | 0 | 0 | 16 |
| Extensão | 3 | 2 | 0 | 5 |

**Interpretação:** contagens de pacotes afetados, com efeitos transitivos e repetição entre projetos. Não são 114 vulnerabilidades independentes nem 114 explorações confirmadas. Os JSON guardam todos os avisos retornados, relações e referências.

**Prioridade:** xlsx 0.18.5 participa de importações e tem avisos de prototype pollution/ReDoS. Gateway usa nodemailer 6.10.1/mailparser 3.9.9, com parsing de mensagens externas. Vite 5.4.19 na raiz e 5.4.21 na extensão têm avisos do ambiente de desenvolvimento; isso não prova vulnerabilidade do site estático publicado.

**Correção:** atualizar por componente com análise de compatibilidade e retestar parsing, envio, importação e auth. Para SheetJS, verificar distribuição oficial mantida ou substituir parser; não assumir que atualizar o pacote npm antigo resolve. Não usar audit fix --force sem revisão.

**Limites:** avisos não foram todos reproduzidos nem todos os caminhos considerados alcançáveis. Por exemplo, opts examinados do gateway não recebem envelope.size/raw do utilizador, apesar de existirem avisos relacionados no pacote.

## A14 — Alta condicionada: migração restaura privilégios amplos

**Evidências:** [migration/sql/50-grants.sql:9](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/migration/sql/50-grants.sql:9>); [migration/sql/50-grants.sql:10](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/migration/sql/50-grants.sql:10>); [supabase/migrations/20260826140000_chaves_da_organizacao_fora_do_browser.sql:84](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/migrations/20260826140000_chaves_da_organizacao_fora_do_browser.sql:84>).

**Problema:** 50-grants.sql concede ALL em todas as tabelas/rotinas/sequências a anon/authenticated/service_role e configura defaults amplos. Rodá-lo depois do hardening pode restaurar SELECT da tabela organizations inteira e EXECUTE de funções internas.

**Impacto:** membros que passam no RLS podem voltar a ler colunas secretas; funções definer podem ser reexpostas. A existência do script não prova execução posterior às proteções.

**Correção/validação:** substituir concessões globais por lista mínima explícita, preservar revogações e comparar ACLs ao fim da migração em cópia isolada do esquema. Confirmar colunas secretas ilegíveis e funções internas inacessíveis aos clientes.

## A15 — Alta condicionada: webhook Brevo falha aberto

**Evidências:** [supabase/functions/brevo-webhook/index.ts:26](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/brevo-webhook/index.ts:26>); [supabase/functions/brevo-webhook/index.ts:27](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/brevo-webhook/index.ts:27>); [supabase/config.toml:78](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/config.toml:78>).

**Problema:** com verify_jwt=false, a credencial só é conferida se BREVO_WEBHOOK_SECRET existir. Sem variável, eventos passam sem autenticação. Rate limit em memória não comprova origem.

**Impacto:** com message-id conhecido, falsificar estados de envio/abertura/rejeição/subscrição. O caminho está protegido se o segredo estiver corretamente configurado; estado remoto não consultado.

**Correção/validação:** falhar fechado sem segredo e alertar erro de configuração; usar autenticação suportada pelo provedor. Testar variável ausente, segredo incorreto e correto, antes de qualquer escrita.

## A16 — Média: quotas insuficientes em IA/prospecção

**Evidências:** [supabase/functions/otto/index.ts:107](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/otto/index.ts:107>); [supabase/functions/otto/index.ts:143](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/otto/index.ts:143>); [supabase/functions/generate-prospects/index.ts:146](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/generate-prospects/index.ts:146>).

**Problema:** Otto continua a chamar IA sem acesso autenticado a dados, recebe histórico livre e não aplica rate limit próprio no handler. Cinco iterações é teto por pedido, não quota por utilizador. Prospecção verifica membership, mas encaminha volume/opções sem orçamento próprio por tenant.

**Impacto:** consumo de créditos/capacidade partilhada. Membership não garante autorização de prospecção nem limita custo. Provedores/plataforma podem impor limites externos, não auditados.

**Correção/validação:** quotas partilhadas por conta/tenant/IP, orçamento, limite de histórico/corpo/resultados/enriquecimento e permissão do módulo. Rejeitar antes da chamada paga. Não foi feito teste de carga.

## A17 — Média: fórmulas em exportações CSV

**Evidência:** [src/lib/export.ts:239](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/src/lib/export.ts:239>).

**Problema/impacto:** dados passam a json_to_sheet/sheet_to_csv sem neutralização dos campos textuais com prefixos de fórmula. O teste produziu `Nome` seguido de `=1+1` intacto. Ao abrir numa folha de cálculo que interpreta fórmulas, conteúdo controlado por terceiro pode ser avaliado. Não foi demonstrada execução de comandos nem teste no Excel.

**Correção/validação:** neutralizar prefixos `=`, `+`, `-`, `@` e caracteres de controle em campos textuais segundo a política de exportação; preservar números legítimos. Testar aspas/separadores/quebras de linha e diferenciar CSV de XLSX com células textuais.

## A18 — Baixa: health revela metadados de caixas

**Evidências:** [email-gateway/src/server.js:28](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/email-gateway/src/server.js:28>); [email-gateway/src/idle.js:291](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/email-gateway/src/idle.js:291>).

**Problema/impacto:** rota sem autenticação devolve IDs/labels/estado/lastError das caixas. Processo escuta em 0.0.0.0. Se a porta estiver acessível fora da rede de gestão, expõe inventário de tenants. Publicação da porta não confirmada.

**Correção/validação:** liveness pública mínima; detalhes autenticados em rede de gestão. Conferir firewall e resposta sem credenciais.

## A19 — Baixa: cabeçalhos de defesa não versionados

**Evidência:** [vercel.json:2](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/vercel.json:2>).

**Problema/impacto:** há regras de cache, mas não CSP, proteção contra framing, Referrer-Policy ou X-Content-Type-Options no arquivo. Plataforma/edge podem acrescentá-los; não foi inspecionada resposta publicada. Isso reduz defesa adicional contra injeção/clickjacking, sem ser a causa do XSS.

**Correção/validação:** política por rota, protegendo CRM autenticado e preservando formulários públicos incorporáveis; introduzir CSP Report-Only e depois enforcement compatível. Testar Meta, recursos e embeds. Não aplicar frame-ancestors indiscriminadamente aos formulários.

## A20 — Média: dados pessoais/conteúdo em logs

**Evidências:** [supabase/functions/submit-lead/index.ts:315](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/submit-lead/index.ts:315>); [supabase/functions/submit-lead/index.ts:330](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/submit-lead/index.ts:330>); [supabase/functions/otto/index.ts:187](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/otto/index.ts:187>); [supabase/functions/check-reminders/index.ts:75](<C:/Users/ThiagoSousa/OneDrive - DASPRENT/Documentos/Thiago/senvia-portugal-crm-main/supabase/functions/check-reminders/index.ts:75>).

**Problema/impacto:** logs contêm payload parcial, nome/email/telefone/notas, argumentos de ferramentas e notificações. Truncar caracteres não anonimiza. Leitores dos logs podem obter informação além da necessária; campos livres podem conter dados sensíveis. Não foi lido um dump real de logs.

**Correção/validação:** IDs técnicos, ação/duração/código em vez de conteúdo; mascaramento, retenção mínima e controle de acesso. Testar com fixtures rastreáveis e confirmar ausência nos sinks. Retenção/permissões remotas não auditadas.

## Controles positivos e falsos positivos evitados

- Migrations recentes retiram colunas secretas de organizations do SELECT cliente e migram passwords/tokens de canais para tabelas sem políticas cliente. Dependem de aplicação e de não serem desfeitas por grants globais.
- internal_service_key, automation_internal_secret e get_vault_secret têm revogações posteriores de execução; não foram reportadas como vazamento atual apenas pelas definições antigas.
- create-team-member/manage-team-member revalidam administração da organização. A09 trata dos efeitos globais posteriores, não ignora essa correção.
- Leitor de email usa sandbox sem scripts e CSP para recursos remotos. A02 está na resposta/encaminhamento.
- Pareamento da extensão restringe a origem a app.senvia.pt; o manifesto limita hosts. Não foi demonstrado vazamento de sessão pela ponte examinada.
- submit-lead/store-api usam rate limit partilhado em banco. O helper falha aberto em erro, portanto não é barreira absoluta nem autenticação.
- Busca dirigida em arquivos versionados não encontrou chaves privadas PEM/OpenSSH, tokens Stripe live/GitHub/AWS/Supabase secret ou JWT service_role correspondentes aos padrões usados. Não cobre histórico Git, arquivos ignorados, formatos fora dos padrões ou ambiente remoto. Chaves anon/publishable são públicas por desenho e não foram classificadas como segredos.

## Prioridade de correção

1. Confirmar imediatamente o estado publicado e conter A01/A11: grants das RPCs e isolamento entre tenants. Corrigir/proteger editor A02 e autenticação da loja A06.
2. Corrigir autorização A03–A05 e A07–A10 com matriz de dois tenants, perfis, caixas e sessões previamente emitidas.
3. Corrigir saídas de rede, dependências, migração e webhook: A12–A15.
4. Quotas, exportação, health, headers e logs: A16–A20.
5. Acrescentar testes de segurança de autorização e verificação de grants pós-migração; auditar dependências/segredos no CI.

Não foram aplicadas correções ao produto. Foram criados somente os arquivos desta pasta de auditoria. Os quatro arquivos de administração já modificados antes da auditoria foram preservados.

## O que falta para uma auditoria completa do ambiente

- Confirmar migrations, RLS, owners/grants das RPCs, buckets e versões de Edge Functions efetivamente implantadas.
- Testes reais em staging com contas e dados de teste: isolamento tenant, alteração de papel, remoção, MFA, concorrência de filas e IMAP.
- Verificar Auth remoto: MFA, CAPTCHA, limites, recuperação, revogação e ativação de hooks. A função de bloqueio por senha existir no SQL não prova que o hook esteja ativado no serviço.
- Validar execução/neutralização do HTML no navegador: abertura da fixture negada pela revisão automática por limite de utilização. Nenhuma captura comprova execução; não houve tentativa de contornar o bloqueio.
- Verificar egress/firewall, TLS, cabeçalhos publicados, IAM, backups/restauração, retenção/acesso a logs e gestão de segredos.
- Revisão manual restante por módulo e revisão independente. Os testes existentes encontrados são sobretudo de recorrências e cleanup, não demonstram cobertura das fronteiras de segurança identificadas.
- send-scheduled-messages existe como diretório/config, mas não contém index.ts local. Não foi possível auditar a implementação a partir desta cópia.

Este documento é uma auditoria local ampla com lacunas explicitadas, não certificação de ausência de outras falhas nem pentest completo em produção. Build/lint geral não foram usados como evidência de segurança e não se afirma que passaram.

## Evidências e reprodução

- `inventory.json`: commit, hashes e inventário; sinais de auth por regex são triagem, não parecer de segurança.
- `local-results.json`: 11 ensaios locais com dependências simuladas.
- `store-chain-result.json`: teste adicional de alteração do telefone usado no login.
- `verify-local.cjs`, `verify-store-chain.cjs`: testes reproduzíveis locais, sem conectar à produção.
- `xss-fixture.html`: marcador inofensivo na própria página, sem exfiltração; validação no navegador pendente.
- `npm-root.json`, `npm-gateway.json`, `npm-extension.json`: todos os avisos do npm audit nesta execução.

Resultados positivos dos ensaios significam **problema reproduzido**, não aplicação segura. A07 foi testado no cenário vazio: comprova ausência da barreira antes do banco, não execução de notificações reais. A05 comprova a referência estrangeira chegar à operação, com IMAP/SQL simulados.

## Referências externas

- [Supabase: funções e privilégios](https://supabase.com/docs/guides/database/functions), incluindo SECURITY DEFINER e EXECUTE padrão.
- [Supabase: MFA](https://supabase.com/docs/guides/auth/auth-mfa), incluindo aal1/aal2 e enforcement no backend/banco.
- [SheetJS CVE-2023-30533](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6): prototype pollution ao ler arquivos; versões anteriores a 0.19.3.
- [SheetJS CVE-2024-22363](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9): ReDoS; versões anteriores a 0.20.2.

Outras referências específicas estão nas respostas JSON do npm audit; não foi feita análise manual de todas as advisories.
