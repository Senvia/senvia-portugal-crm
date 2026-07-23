# Remodelacao do Otto — Especificacao

> Otto 2.0: de assistente de suporte read-only para agente de plataforma completo com experiencia visual interativa.
> Documento vivo — vamos preenchendo juntos.

## Sumario

* [Problemas do Otto Atual](#problemas-do-otto-atual)
* [Visao Geral: 3 Camadas](#visao-geral-3-camadas)
* [Modos de Operacao](#modos-de-operacao)
* [Camada 1: Backend (Tools + State Machine)](#camada-1-backend-tools--state-machine)
* [Camada 2: Spotlight/Tour Interativo](#camada-2-spotlighttour-interativo)
* [Camada 3: Avatar do Otto](#camada-3-avatar-do-otto)
* [Componentes Frontend](#componentes-frontend)
* [Fluxo Completo: Onboarding com Configuracao Autonoma + Tour Visual](#fluxo-completo-onboarding-com-configuracao-autonoma--tour-visual)
* [Tickets Inteligentes](#tickets-inteligentes)
* [Plano de Implementacao](#plano-de-implementacao)
* [Decisoes Tomadas](#decisoes-tomadas)

\---

## Problemas do Otto Atual

1. **Read-only** — so pesquisa, nunca cria/altera nada. O system prompt proibe escrever.
2. **Tools implementadas como switch statement** — 13 cases monolithic. Escala horrivel.
3. **Ticket system manual** — 4-passos de perguntas chatas. Nao usa contexto existente.
4. **Modelo fixo** — Gemini 2.5 Flash hardcoded.
5. **Sem memoria de sessoes** — cada conversa comeca do zero. Nao sabe em que passo do onboarding o cliente esta.
6. **Sem autenticacao de ferramentas** — usa supabaseAdmin (service\_role). Qualquer tool tem acesso total.
7. **Sem streaming real** — faz um loop ate resolver, depois devolve tudo de uma vez.
8. **System prompt gigante** — 500+ linhas. Tudo ao mesmo tempo.
9. **Zero experiencia visual** — so texto. Nao ha overlay, spotlight, avatar, nem guia visual.

\---

## Visao Geral: 3 Camadas

O Otto funciona em 3 camadas que atuam em simultaneo:

```
┌─────────────────────────────────────────────────────┐
│                  OTTO 2.0                            │
├─────────────────────────────────────────────────────┤
│                                                     │
│   CAMADA 1 — BACKEND (codigo do Thiago)             │
│   ┌─────────────────────────────────────────────┐   │
│   │ • Registry de tools (read/write/onboarding) │   │
│   │ • State machine de onboarding               │   │
│   │ • Permissoes e auditoria                    │   │
│   │ • Edge functions + Supabase                 │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   CAMADA 2 — SPOTLIGHT / TOUR VISUAL                │
│   ┌─────────────────────────────────────────────┐   │
│   │ • Overlay com destaque (spotlight)          │   │
│   │ • Setas animadas e tooltips                 │   │
│   │ • Elementos a piscar/glow                   │   │
│   │ • Tour passo-a-passo na UI                  │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
│   CAMADA 3 — AVATAR DO OTTO                         │
│   ┌─────────────────────────────────────────────┐   │
│   │ • Robotinho animado (Lottie/SVG)            │   │
│   │ • Expressoes: neutro, feliz, confuso, aponta│   │
│   │ • Aparece nos cantos dos modais/overlays    │   │
│   └─────────────────────────────────────────────┘   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Regra de ouro:** as 3 camadas funcionam em simultaneo. O backend configura, o spotlight mostra onde, o avatar da a cara.

\---

## Modos de Operacao

* **Detecao automatica:** Otto decide sozinho. Se organizacao esta em trial ou sem plano ativo, entra em modo onboarding. Se ja configurado, entra em modo suporte.
* **Tools de escrita:** disponiveis para administradores em qualquer modo. O cliente cola as credenciais no chat/modal, o Otto guarda no lugar certo.
* **Prioridade:** Onboarding primeiro (ativacao). Tickets depois.
* **Token budget:** nao e problema para ja.
* **Modelo:** manter Gemini 2.5 Flash por agora. Muda depois se quiser.

\---

## Camada 1: Backend (Tools + State Machine)

### Stack e Arquitetura

```
supabase/functions/
  otto/
    index.ts                        → router principal (recebe request, encaminha)
    lib/
      context.ts                    → carrega contexto da organizacao, utilizador, estado
      tools/
        registry.ts                 → registo central de tools (cada tool e um ficheiro)
        search-clients.ts           → Ferramentas de consulta (read)
        search-leads.ts
        search-invoices.ts
        create-lead.ts              → Ferramentas de escrita (write)
        create-client.ts
        configure-invoicexpress.ts  → Ferramentas de configuracao (onboarding)
        configure-brevo.ts
        configure-whatsapp.ts       → abre modal de conexao WhatsApp
        invite-member.ts
        setup-pipeline.ts
        submit-ticket.ts            → Ferramentas de suporte (ticket inteligente)
        get-ticket-status.ts
      state-machine/
        onboarding.ts               → state machine de onboarding (checks reais)
        states.ts                   → definicao de estados
      ai/
        client.ts                   → cliente AI (Gemini / modelo via env var)
        prompts/
          system-core.md            → identidade e regras base (pequeno, 30 linhas)
          system-tools.md           → descricao das tools para o modelo
          system-onboarding.md      → comportamento no modo onboarding
          system-support.md         → comportamento no modo suporte
      audit.ts                      → registo de auditoria para writes
```

### Registry Pattern (confirmado)

```typescript
export interface Tool {
  name: string;
  description: string;
  parameters: JSONSchema;
  adminOnly?: boolean;
  isWrite?: boolean;
  permission?: { module: string; subarea: string; action: string };
  execute: (args: any, ctx: ToolContext) => Promise<ToolResult>;
}
```

### Detection Mode Automate

```typescript
export function resolveMode(org: OrgInfo, state: OnboardingState): "support" | "onboarding" {
  if (state.dismissed || state.completed) return "support";
  const inTrial = !!org.trial\_ends\_at \&\& new Date(org.trial\_ends\_at).getTime() > Date.now();
  const newOrg = !org.plan || org.plan === "trial";
  return (inTrial || newOrg) ? "onboarding" : "support";
}
```

### Tools de Onboarding (novas)

|Tool|O que faz|Autonomo?|
|-|-|-|
|`get\_onboarding\_status`|Verifica em que passo esta|N/A (so le)|
|`set\_company\_info`|Define dados da empresa|Autonomo (cliente fornece dados)|
|`configure\_invoicing`|InvoiceXpress ou KeyInvoice|Autonomo (cliente cola API key)|
|`configure\_brevo`|Email marketing|Autonomo (cliente cola API key)|
|`configure\_whatsapp`|Abre modal de conexao WhatsApp|Abre modal, cliente escaneia QR|
|`setup\_pipeline\_stages`|Cria pipeline de vendas|Totalmente autonomo|
|`set\_modules`|Ativa/desativa modulos|Autonomo (cliente escolhe)|
|`invite\_member`|Convida membro da equipa|Autonomo (cliente fornece email)|
|`import\_leads`|Importa leads de CSV|Autonomo (cliente envia ficheiro)|
|`complete\_onboarding`|Marca onboarding como concluido|Autonomo|

### Integracao com Supabase

```sql
CREATE TABLE org\_onboarding\_state (
  organization\_id UUID PRIMARY KEY REFERENCES organizations(id),
  current\_stage TEXT NOT NULL DEFAULT 'WELCOME',
  stages\_completed TEXT\[] DEFAULT '{}',
  dismissed BOOLEAN DEFAULT false,
  started\_at TIMESTAMPTZ DEFAULT NOW(),
  completed\_at TIMESTAMPTZ,
  updated\_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Dados sensiveis

API keys (Brevo, InvoiceXpress, KeyInvoice) sao guardadas na tabela `organizations` com RLS restrito. O Otto usa `service\_role` apenas para writes de configuracao, e auditoria regista cada operacao na tabela `audit\_log`.

\---

## Camada 2: Spotlight / Tour Interativo

### O que e

Quando o Otto esta em modo onboarding, em vez de apenas mostrar texto, ele abre um overlay interativo sobre a interface do SENVIA OS que:

1. **Escurece o fundo** (overlay semi-transparente)
2. **Ilumina um elemento especifico** com efeito spotlight (circulo de luz que destaca o botao/campo)
3. **Mostra uma seta animada** a apontar para onde clicar/preencher
4. **Exibe um card do Otto** com avatar + texto explicativo curto
5. **Faz o elemento alvo piscar/glow** suavemente para chamar atencao

### Como identificar elementos na UI

Cada elemento interativo no SENVIA OS que o Otto pode referenciar leva um atributo:

```tsx
// Exemplo no componente Integracoes
<button data-otto-target="integrations-whatsapp-connect">
  Conectar WhatsApp
</button>
```

Lista de `data-otto-target` pre-definidos:

|Atributo|Elemento|Usado em|
|-|-|-|
|`sidebar-settings`|Botao Definicoes no menu lateral|Sempre que precisa de levar a config|
|`sidebar-integrations`|Botao Integracoes no menu|Configurar Brevo, InvoiceXpress|
|`sidebar-leads`|Botao Leads|Pipeline, importar leads|
|`integrations-whatsapp-connect`|Botao "Conectar WhatsApp"|Configurar WhatsApp|
|`settings-company-name`|Campo "Nome da empresa"|set\_company\_info|
|`settings-company-nif`|Campo "NIF"|set\_company\_info|
|`settings-pipeline-add`|Botao "Adicionar etapa"|setup\_pipeline\_stages|
|`settings-invite-member`|Botao "Convidar membro"|invite\_member|
|`settings-invoicexpress-api`|Campo "API Key InvoiceXpress"|configure\_invoicing|
|`settings-brevo-api`|Campo "API Key Brevo"|configure\_brevo|
|`leads-import-btn`|Botao "Importar leads"|import\_leads|

### Componente: OttoSpotlightTour

```tsx
interface SpotlightStep {
  targetId: string;           // data-otto-target value
  title: string;              // "Conectar WhatsApp"
  description: string;        // "Clica no botao Conectar WhatsApp para iniciares a configuracao"
  avatarExpression: 'neutral' | 'happy' | 'pointing' | 'confused';
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
  action?: 'highlight' | 'pulse' | 'glow' | 'click-demo';
  modalContent?: ReactNode;   // conteudo opcional do modal que substitui o elemento
  onNext?: () => void;
  onSkip?: () => void;
}
```

### Efeitos visuais

**Spotlight:** circulo radial semi-transparente que ilumina o elemento alvo e escurece o resto. O raio do circulo deve ser suficiente para destacar o elemento e um pouco a volta.

```
┌────────────────────────────────┐
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← fundo escuro
│   ░░   ┌──────────┐     ░░░░  │
│   ░░   │ BOTAO    │     ░░░░  │  ← elemento iluminado
│   ░░   └──────────┘     ░░░░  │
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│        ←\[seta animada]         │
│   ┌────────────────────┐       │
│   │ 🤖 Card do Otto    │       │  ← tooltip com avatar
│   │ "Clica aqui!"      │       │
│   └────────────────────┘       │
└────────────────────────────────┘
```

**Pulse/Glow:** animacao CSS que faz o elemento alvo ter um brilho pulsante, tipo `@keyframes pulse-glow` com box-shadow dourado.

```css
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 5px rgba(255, 200, 0, 0.4); }
  50%      { box-shadow: 0 0 20px rgba(255, 200, 0, 0.9); }
}
```

**Seta animada:** SVG ou CSS puro que aponta para o alvo e tem um movimento tipo "de onda" a chamar atencao.

```
  ──→   (seta a mexer-se lentamente para a direita e voltar)
```

**Transicao de passos:** desvanecimento suave (fade) entre passos, com o fundo a escurecer e iluminar consoante o novo alvo.

### Quando usar o Spotlight

O spotlight ativa-se automaticamente quando:

1. O Otto diz algo que referencia um elemento da UI (botao, campo, menu)
2. O Otto sugere uma acao que envolve clique
3. O Otto mostra onde ficou guardada uma configuracao (ex: "API key guardada, podes ver em...")

Nao se ativa para conversas puramente informativas ("Como crio uma lead?"). So para accoes.

\---

## Camada 3: Avatar do Otto

### O que e

Um robotinho estilizado (nao realista) que serve como mascote do Otto. Aparece em:

* **Modais de configuracao** — no canto superior direito do modal
* **Overlays de spotlight** — dentro do card de texto
* **Badge no FAB** — quando ha onboarding pendente
* **Cabecalho do chat** — versao pequena ao lado do nome "Otto"

### Animacoes

|Expressao|Uso|
|-|-|
|**Neutro**|Estado padrao, conversa normal|
|**Feliz**|Quando conclui um passo, configura algo com sucesso|
|**Confuso**|Quando o utilizador faz algo inesperado ou o Otto nao entende|
|**A apontar**|Quando o spotlight destaca um elemento ("Clica ali!")|
|**A ouvir**|Enquanto o utilizador esta a digitar|

### Formato

* **Lottie** (animacoes JSON leves) para versao final
* **SVG estatico** para fallback/placeholder
* Tamanho: \~64x64 px em modais, \~32x32 px no chat, \~48x48 px no FAB
* Cores: tons de azul/ciano (cores da marca SENVIA)

### Implementacao

```tsx
// OttoAvatar.tsx
interface OttoAvatarProps {
  expression: 'neutral' | 'happy' | 'confused' | 'pointing' | 'listening';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Uso
<OttoAvatar expression="pointing" size="md" />
```

Importar animacoes Lottie de um ficheiro JSON ou usar SVG inline com animacoes CSS para versao inicial.

\---

## Componentes Frontend

### Mapa de componentes

```
src/
  components/
    otto/
      OttoChatWindow.tsx          → Container principal (ja existe, refatorar)
      OttoMessages.tsx            → Lista de mensagens (ja existe)
      OttoInput.tsx               → Input de texto (ja existe)
      OttoOnboardingUI.tsx        → Integracao com o sistema de tour
      OttoFAB.tsx                 → Botao flutuante (ja existe, melhorar)
      OttoAvatar.tsx              → NOVO: Robotinho animado
      OttoSpotlight.tsx           → NOVO: Overlay de spotlight
      OttoStepCard.tsx            → NOVO: Card de cada passo (avatar + texto + seta)
      OttoModal.tsx               → NOVO: Modal de configuracao (substitui chat para inputs)
```

### OttoSpotlight.tsx — detalhe

```tsx
interface OttoSpotlightProps {
  active: boolean;
  steps: SpotlightStep\[];
  currentStep: number;
  onComplete: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}
```

Funcionamento:

1. Quando `active = true`, o componente renderiza um portal (React Portal) no topo do DOM
2. Cria um overlay full-screen com background semi-transparente
3. Calcula a posicao do elemento alvo via `document.querySelector(\[data-otto-target="${targetId}"])`
4. Renderiza o spotlight (circulo de luz) na posicao do elemento
5. Renderiza a seta animada + OttoStepCard ao lado
6. Quando o utilizador clica no elemento, avanca para o proximo passo
7. Quando `currentStep === steps.length`, chama `onComplete()`

### OttoModal.tsx — detalhe

```tsx
interface OttoModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;     // campos de input, botoes, etc
  avatar?: OttoAvatarProps;
  onConfirm?: () => void;
  confirmText?: string;
}
```

Usado para:

* Inserir API keys (Brevo, InvoiceXpress)
* Preencher dados da empresa
* Convidar membros
* O modal tem o avatar do Otto no canto superior direito a dar instrucoes

### Fluxo de streaming

O backend ja envia SSE. O frontend consome e:

1. Texto aparece caractere a caractere no OttoMessages
2. Quando o texto referencia um `data-otto-target`, o sistema de spotlight abre automaticamente
3. A transicao entre "texto a aparecer" e "spotlight a abrir" e suave

\---

## Fluxo Completo: Onboarding com Configuracao Autonoma + Tour Visual

### Exemplo: Configurar InvoiceXpress

1. Utilizador entra no SENVIA OS em trial
2. Otto detecta modo onboarding (resolveMode = "onboarding")
3. Otto abre OttoChatWindow com mensagem de boas-vindas + OttoAvatar feliz
4. Otto diz: "Vamos configurar a tua faturacao. Qual provedor usas? InvoiceXpress ou KeyInvoice?"
5. Utilizador: "InvoiceXpress"
6. Otto abre OttoModal com campo "API Key" + avatar do Otto a apontar + texto "Encontra a tua API key em..."
7. Utilizador cola a API key, clica "Guardar"
8. Backend: `configure\_invoicing` guarda no Supabase, auditoria regista
9. Spotlight abre-se: destaca o menu lateral em "Definicoes" com seta animada + Otto a apontar
10. Card do Otto: "A API key foi guardada! Podes ver em Definicoes > Integracoes > InvoiceXpress"
11. Spotlight fecha automaticamente apos 3 segundos
12. Otto avanca para o proximo passo do onboarding

### Exemplo: Configurar Pipeline (totalmente autonomo)

1. Utilizador: "Cria uma pipeline de vendas padrao"
2. Backend: `setup\_pipeline\_stages` cria as etapas (Novo, Contactado, Proposta, Negociacao, Ganho, Perdido)
3. Spotlight abre-se: destaca o menu "Leads" com seta animada
4. Card do Otto (avatar feliz): "Pipeline criada! 6 etapas. Vai a Leads para veres."
5. Spotlight fecha

### Exemplo: Conectar WhatsApp (modal integrado)

1. Otto: "Queres conectar o WhatsApp da empresa?"
2. Utilizador: "Sim"
3. Otto abre OttoModal com o formulario de conexao WhatsApp (numero + botao "Conectar")
4. O modal tem o avatar do Otto no canto com texto "Digita o numero com o codigo do pais, ex: +351..."
5. Spotlight destaca o campo de numero com pulse/glow
6. Utilizador preenche, clica em "Conectar"
7. O modal mostra QR code para escanear
8. Quando conectado, avatar fica feliz, modal fecha

\---

## Tickets Inteligentes

### Problema do sistema atual

O utilizador diz "abre um ticket" e o Otto faz 4 perguntas chatas. O contacto ja existe na BD mas ele pergunta na mesma.

### Novo fluxo

1. Utilizador diz "abre um ticket, o invoicexpress nao esta a sincronizar"
2. Otto extrai automaticamente:

   * Contexto: organizacao, modulo (InvoiceXpress), versao
   * Contacto: busca na BD sem perguntar
   * Assunto: infere da frase do utilizador
3. Otto mostra preview no chat: "Vou abrir um ticket: InvoiceXpress nao sincroniza | Prioridade: Normal | Confirma?"
4. Utilizador confirma
5. Otto cria ticket com contexto rico

### Regras de prioridade automatica

* "invoicexpress nao funciona", "perdi dados" → high
* "como criar uma lead?" → low
* "faturamento errado" → critical

\---

## Plano de Implementacao

### Fase 1 — Backend (Thiago) — Feito ✅

* \[x] Separar `otto-chat/index.ts` em pasta `otto/` com estrutura `lib/`
* \[x] Implementar registry pattern de tools
* \[x] Criar `context.ts` para carregar estado da organizacao
* \[x] State machine de onboarding com checks reais
* \[x] Detecao automatica de modo (trial vs configurado)

### Fase 2 — Tools de Escrita (Thiago) — Em andamento

* \[ ] Implementar `createLead`, `createClient` (escrita basica)
* \[ ] Implementar `setupPipeline`, `setCompanyInfo`
* \[ ] Auditoria de writes
* \[ ] Migrar tools existentes (search) para o novo registry

### Fase 3 — Onboarding State Machine Completar (Thiago)

* \[ ] Ferramentas de configuracao (InvoiceXpress, Brevo, WhatsApp)
* \[ ] Criar tabela `org\_onboarding\_state` no Supabase
* \[ ] Tool `import\_leads` para CSV

### Fase 4 — Frontend Visual (Thiago)

* \[ ] Criar `OttoAvatar.tsx` — robotinho animado
* \[ ] Criar `OttoSpotlight.tsx` — sistema de spotlight/tour
* \[ ] Criar `OttoStepCard.tsx` — cartao de cada passo
* \[ ] Criar `OttoModal.tsx` — modal de configuracao
* \[ ] Integrar `data-otto-target` nos componentes do SENVIA OS
* \[ ] Adicionar `OttoOnboardingUI.tsx` ao fluxo principal
* \[ ] Streaming UI com consumo correto de SSE

### Fase 5 — Tickets Inteligentes (Thiago)

* \[ ] Refactor submitTicket para extracao automatica de contexto
* \[ ] Prioridade automatica
* \[ ] Buscar contacto da BD

\---

## Decisoes Tomadas (20/06/2026)

* **Modos:** detecao automatica — Otto decide se entra em modo onboarding ou suporte baseado no estado da organizacao (trial → onboarding, configurado → suporte)
* **Tools de escrita:** disponiveis sempre para administradores, com auditoria. Cliente cola credenciais no chat/modal, Otto guarda no lugar certo.
* **Experiencia hibrida:** Otto configura o que pode (autonomo) + mostra visualmente onde fica (spotlight/tour) + avatar da a cara
* **AI Provider:** Gemini 2.5 Flash (mantido). Pode mudar depois.
* **Prioridade:** Onboarding primeiro (ativacao). Tickets depois.
* **Orcamento tokens:** nao e problema para ja.
* **Efeitos visuais:** spotlight (circulo de luz + fundo escuro), pulse/glow no elemento alvo, setas animadas, transicoes suaves, avatar Lottie/SVG com expressoes

\---

## Checklist de data-otto-target

Elementos no SENVIA OS que precisam do atributo `data-otto-target`:

|Atributo|Onde adicionar|
|-|-|
|`sidebar-settings`|Botao Definicoes no menu lateral|
|`sidebar-integrations`|Botao Integracoes no menu lateral|
|`sidebar-leads`|Botao Leads no menu lateral|
|`integrations-whatsapp-connect`|Botao "Conectar WhatsApp"|
|`integrations-invoicexpress-config`|Secao InvoiceXpress|
|`integrations-brevo-config`|Secao Brevo|
|`settings-company-name`|Campo "Nome da empresa"|
|`settings-company-nif`|Campo "NIF"|
|`settings-pipeline-add`|Botao "Adicionar etapa"|
|`settings-invite-member`|Botao "Convidar membro"|
|`settings-invoicexpress-api`|Campo "API Key InvoiceXpress"|
|`settings-brevo-api`|Campo "API Key Brevo"|
|`leads-import-btn`|Botao "Importar leads"|



