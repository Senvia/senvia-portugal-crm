# Correções da auditoria de segurança

Data da execução: 11/09/2026. Escopo autorizado: A01–A20, exceto A06/loja. As seis migrations de segurança foram aplicadas de forma atómica ao projeto Supabase configurado depois de um ensaio completo com `ROLLBACK`; funções Edge e frontend não foram publicados por esta etapa.

| Achado | Estado local | Correção principal |
|---|---|---|
| A01 | Corrigido | RPCs internas de pesquisa são exclusivas do `service_role`; diretório de organizações valida a organização do chamador. |
| A02 | Corrigido | HTML de e-mail é sanitizado no carregamento, citação, colagem, assinatura, gravação e envio. |
| A03 | Corrigido | Administração é calculada por organização e perfil ativo; função global deixou de conceder poderes locais. |
| A04 | Corrigido | Escritas usam permissões de módulo e escopo próprio/equipa/todos através de políticas restritivas. |
| A05 | Corrigido | Comandos de e-mail ligam autor, caixa, organização, pasta, mensagem e anexo; a autorização é revalidada ao executar. |
| A06 | Excluído | Loja/e-commerce preservados por instrução do proprietário; será discutido separadamente. |
| A07 | Corrigido | Onze jobs exigem segredo interno ou credencial de serviço; a fila usa claim atómico e não repete entregas ambíguas. |
| A08 | Aplicação faseada | MFA permanece opcional até 20/09/2026. A partir de 21/09/2026, à meia-noite de Lisboa, o banco exige AAL2. A UI avisa diariamente quem ainda não configurou autenticador e liga diretamente à configuração; consultas protegidas aguardam o gate MFA. |
| A09 | Corrigido | Administrador local só altera membership da organização; senha e identidade global ficam com o titular. |
| A10 | Corrigido | Organização ativa vem apenas de membership ativa; fallback residual do perfil foi removido. |
| A11 | Corrigido | Geração de comissões é privada ao serviço e continua acessível aos triggers autorizados. |
| A12 | Corrigido | Egress de e-mail restringe DNS/IP/portas/TLS; transcrição aceita somente anexo autorizado, com timeout e limite de 20 MiB. |
| A13 | Corrigido | Dependências e locks dos três pacotes foram atualizados; auditorias npm finais não registram vulnerabilidades. |
| A14 | Corrigido | Restauração preserva ACLs granulares e falha se expuser colunas secretas ou RPCs internas. |
| A15 | Corrigido | Webhook Brevo fica indisponível quando o segredo não existe e rejeita segredos incorretos. |
| A16 | Corrigido | Otto, prospecção e transcrição têm quotas persistentes e limites estritos de entrada; UI usa os mesmos limites. |
| A17 | Corrigido | CSV neutraliza fórmulas e caracteres de controlo, força aspas e preserva valores numéricos. |
| A18 | Corrigido | `/health` expõe apenas `{ok:true}`; detalhes exigem o segredo existente. |
| A19 | Corrigido localmente | Cabeçalhos versionados incluem `nosniff`, referrer policy, anti-framing e CSP básica; recursos permanecem Report-Only até observação em staging. |
| A20 | Corrigido nos caminhos auditados | Logs identificados deixaram de registrar payload, campos pessoais e conteúdo livre; testes usam marcadores rastreáveis. |

## Evidência local

- Build do CRM e build da extensão concluíram com código 0.
- 104 testes Node integrados, 34 testes do gateway, 19 verificações PostgreSQL/PGlite e 7 testes Deno passaram.
- Smoke HTTP real local: job sem credencial respondeu 401, Brevo sem segredo respondeu 503 e transcrição com URL arbitrária respondeu 400.
- A fixture insegura anterior falha deliberadamente no teste de privilégios; a versão migrada passa.
- A loja permaneceu fora das migrations de RLS/MFA e o teste confirma que suas políticas não mudaram.

Logs completos ficam em `.omo/evidence/security-fixes/`. A ordem segura das migrations e os testes obrigatórios de staging estão em `supabase/tests/security-README.md`.

## Estado remoto e limites restantes

O Docker local não estava disponível, portanto não houve replay integral num clone local. Antes da aplicação, as seis migrations foram executadas no schema remoto real dentro de uma única transação revertida; após o ensaio passar, foram aplicadas numa segunda transação atómica e o cache do PostgREST foi recarregado. A migração de contenção `20260911123000_security_mfa_incident_rollback.sql` foi aplicada depois de a exigência AAL2 bloquear a leitura e criação de etapas do pipeline em sessões ativas. Em seguida, `20260911130000_security_mfa_staged_enforcement.sql` manteve AAL1 até ao fim de 20/09/2026 e programou a exigência AAL2 para 21/09/2026, preservando isolamento por organização, cargos, permissões e escopo de registos. A validação remota confirmou o acesso atual, a rejeição de outro utilizador e a rejeição futura de AAL1.

O erro `period start must match the next cycle date` no Financeiro vinha de 11 recorrências legadas cujo `next_cycle_date` já não coincidia com o dia âncora. A migração `20260911131500_finance_recurring_cycle_compatibility.sql` foi aplicada em produção para aceitar a data já gravada no ciclo atual e retomar o calendário âncora no ciclo seguinte. O cenário real que retornava 400 passou dentro de uma transação revertida, sem criar cobrança ou dados persistentes. O frontend também deixou de expor a falha como rejeição de Promise sem tratamento. A tabela de histórico de migrations do projeto remoto estava vazia, por isso estas aplicações foram feitas pela API oficial de gestão e não por `db push --include-all`, que tentaria reaplicar todo o histórico local.

Não foram usados Meta, Groq, Brevo, IMAP/SMTP ou dados de negócio reais. A validação em browser foi bloqueada anteriormente pela revisão automática de uso e não foi contornada. O `tsc` global ainda contém erros antigos do esquema/tipos; os builds finais passam e os conjuntos alterados foram validados separadamente.

Ainda é necessário publicar o frontend corrigido antes de 21/09/2026 e validar o aviso e a ativação MFA com utilizadores reais de teste. A política AAL2 já está programada no banco para essa data. Também permanecem a observação de CSP Report-Only, o teste de dois workers concorrentes na fila e a publicação coordenada das funções Edge.
