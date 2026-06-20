# Otto 2.0 — guia de teste e handoff

Branch: `Otto`. Tudo aqui é aditivo: a função antiga `otto-chat` continua intacta
e a servir produção. A branch `Otto` aponta o frontend para a nova função `otto`.

## O que mudou (resumo)

De assistente read-only para agente de plataforma com 3 capacidades:

1. **Suporte** (o que já existia, melhorado): pesquisa de dados, navegação, tickets.
2. **Onboarding** (novo): deteta automaticamente que a org ainda está a configurar-se
   e guia passo a passo, configurando por ti (dados da empresa, faturação, Brevo,
   pipeline, módulos).
3. **Automação** (novo): cria leads/clientes e move leads no pipeline, dentro das
   permissões do utilizador e com auditoria.

Outras melhorias:
- **Arquitetura modular**: `otto-chat` (1 ficheiro, 1114 linhas, switch) → `otto/`
  com registry de tools, `context.ts`, `prompts.ts` separados, `ai.ts`.
- **Modelo configurável por env** (mantém Gemini 2.5 Flash por defeito).
- **Streaming real**: a resposta final chega palavra a palavra (antes vinha tudo
  de uma vez).
- **Tickets inteligentes**: infere assunto/módulo/prioridade, busca o contacto na
  BD e confirma UMA vez (antes eram 4 perguntas chatas).

## PASSO OBRIGATÓRIO ANTES DE TESTAR: correr a migração

A migração `supabase/migrations/20260620120000_otto_onboarding_and_audit.sql` cria
`org_onboarding_state` e `otto_action_log`. Corre o SQL no **Supabase SQL Editor**
(projeto `chhmfwlimtbsyjmgtokn`). Sem isto, o Otto funciona na mesma (degrada com
elegância), mas o badge de onboarding e o `complete_onboarding` não persistem.

> O Otto nunca rebenta se a tabela faltar: os acessos estão protegidos com try/catch.

## A função `otto` precisa de estar deployed

Como testas em local, o frontend (dev server) chama as edge functions **remotas**.
Por isso a nova função tem de estar deployed:

```
supabase functions deploy otto --project-ref chhmfwlimtbsyjmgtokn
```

Usa os mesmos secrets que a `otto-chat` (`GEMINI_API_KEY`, `SUPABASE_*`). Nenhum
secret novo é obrigatório. Opcionais para trocar de modelo:
`OTTO_MODEL`, `OTTO_API_BASE`, `OTTO_API_KEY`.

## Como testar (npm run dev)

1. `npm run dev` e entra no CRM.
2. Abre o Otto (sidebar "Suporte / Otto").

### Suporte (não-regressão)
- "procura o cliente X", "quantos leads tenho?", "resumo financeiro deste mês".
- Deve responder com dados reais e a resposta deve aparecer **palavra a palavra**.

### Tickets inteligentes
- "abre um ticket, o InvoiceXpress não está a sincronizar".
- Otto deve inferir assunto + módulo + prioridade, pedir só o WhatsApp (nome/email
  vêm da BD), mostrar 1 resumo e, após "Sim, enviar", dar o botão de WhatsApp.

### Automação (como admin)
- "cria uma lead: João Silva, joao@x.pt, 912345678". Confirma e cria. Vê em /leads.
- "move a lead do João para Contactado".
- Cada escrita fica registada em `otto_action_log`.

### Onboarding (org em trial / sem configuração)
- Numa org nova, o Otto entra em modo onboarding: aparece o painel de progresso no
  topo do chat e o badge "Configurar" na sidebar.
- "ajuda-me a configurar a empresa" → set_company_info; "configura o pipeline" →
  setup_pipeline_stages; etc.

## Decisões e limites (precisos)

- **Coexistência, não cutover**: `otto-chat` mantém-se. Só fazemos o switch
  definitivo (e merge para main) depois de validares.
- **Tools de escrita**: admins sempre; colaboradores só com permissão de `create`/
  `edit` no módulo (perfil). Configuração/onboarding = admin only. Tudo auditado.
- **setup_pipeline_stages NÃO substitui** um pipeline existente (evita perda de
  dados) — encaminha para Definições nesse caso.
- **NÃO implementei** `inviteTeamMember` nem `importLeads` como ações automáticas
  (precisam de fluxo de auth/upload próprio e seria arriscado meio-feito). O Otto
  encaminha para a UoI nesses casos. Ficam para uma fase seguinte.
- **Componentização do frontend**: fiz a adição de valor (painel de onboarding,
  badge, streaming) e mantive o `OttoChatWindow` como container. Não parti o
  ficheiro em OttoMessages/OttoInput porque seria um split cosmético de alto risco
  num componente que funciona; o ganho real (UI de onboarding) está feito.
- **types.ts**: as tabelas novas ainda não estão nos tipos gerados do Supabase. O
  `useOttoOnboarding` usa um cast pontual. Regenera os tipos depois da migração
  para remover o cast.

## Camada visual (Fase 4 do spec) — spotlight + avatar + tours

Otto agora pode guiar visualmente, não só por texto. Peças:
- `OttoAvatar` (mascote animado por expressão, via framer-motion), `OttoSpotlight`
  (overlay com recorte + seta + pulse), `OttoStepCard`, `OttoModal` (primitivo para
  modais de config), montados por `OttoOnboardingUI` no `AppLayout`.
- Stores: `useTourStore` (tour ativo + passo) e `useModalStore` (abrir modais reais).
- Tours determinísticos em `src/components/otto/tours.ts`. O Otto NÃO inventa passos:
  só dispara um tour por id via um token no texto.

### Como o Otto aciona
- `[modal:whatsapp]` → abre o `ConnectWhatsAppModal` real (QR + instruções). É o
  fluxo do teu exemplo "Otto ajuda a ligar o WhatsApp".
- `[tour:setup_pipeline]` → spotlight no botão Adicionar do pipeline.
- `[tour:invite_member]` → spotlight no botão Adicionar Acesso da equipa.
- `[tour:import_leads]` → spotlight no botão Importar dos Leads.
No chat aparece um botão "Mostra-me: ..." / "Abrir"; ao clicar, o chat fecha e o
spotlight aparece sobre a UI real.

### Como testar
1. Abre o Otto e diz "ajuda-me a ligar o WhatsApp" → deve aparecer o botão que abre
   o modal do QR.
2. "como configuro o pipeline?" / "quero importar leads" / "convidar a equipa" →
   botão "Mostra-me" → navega e ilumina o sítio certo com o avatar a apontar.
3. Faturação/Brevo/dados da empresa: NÃO há spotlight (de propósito). O Otto pede a
   API key no chat e guarda-a sozinho (tools configure_invoicing/brevo/set_company_info).

### Decisões e limites (precisos)
- WhatsApp abre o modal real (cria uma caixa nova ao ligar) — certo para onboarding;
  para uma org que já tenha WhatsApp, criaria uma caixa adicional.
- O deep-link de tours para sub-secções de Definições (`?og=&os=`) funciona ao
  navegar de fora; se já estiveres exatamente nessa página, o spotlight cai no
  cartão centrado (degradação suave, ainda narra).
- `data-otto-target` adicionados em: sidebar (leads/settings), Nova caixa (WhatsApp),
  inputs de API (IX/Brevo), nome da empresa, Adicionar etapa, Adicionar Acesso,
  Importar leads.
- Estes tokens são interpretados no frontend, por isso **a camada visual funciona
  mesmo sem o deploy da função** `otto` (só o cérebro do Otto é que precisa do deploy
  para escolher quando os emitir).

## Rollback rápido

Se algo correr mal, reverte só uma linha em `src/hooks/useOttoChat.ts`:
`/functions/v1/otto` → `/functions/v1/otto-chat`. Volta ao Otto antigo na hora.
