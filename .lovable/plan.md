

# Site de Vendas Profissional para o Senvia OS -- CTA "Teste Gratis"

## Decisao de CTA

Em vez de "Agendar Demo", todos os CTAs principais do site apontam para o registo com trial gratuito de 14 dias, ja que o sistema suporta isso nativamente (sem cartao de credito). Isto remove friccao e acelera a conversao.

| CTA Antigo (removido) | CTA Novo |
|------------------------|----------|
| "Agendar Demonstracao" | "Comecar Teste Gratis" |
| "QUERO ORGANIZAR O MEU ATENDIMENTO" | "Testar Gratis 14 Dias" |
| "Receber Mensagem de Teste" | Manter como CTA secundario |

## Arquitectura do Novo Site

### Routing (App.tsx)

- `/` -> Nova Landing (site de vendas)
- `/login` -> Login (manter, acessivel via "Area do Cliente")
- Todas as outras rotas mantidas

### Estrutura de Componentes (16 ficheiros novos)

```text
src/components/landing/
  LandingHeader.tsx        -- Header sticky + mobile drawer
  AnnouncementBar.tsx      -- Barra topo "14 dias gratis, sem cartao"
  HeroSection.tsx          -- Hero com mockup + CTA "Testar Gratis"
  SocialProofBar.tsx       -- Badges de confianca (RGPD, Made in PT)
  ProblemSection.tsx       -- 3 pain points (manter e melhorar)
  SolutionSteps.tsx        -- Timeline Capture -> Nurture -> Close
  DemoShowcase.tsx         -- Tabs interativas com screenshots do CRM
  FeaturesGrid.tsx         -- Grid 8 features com badges Pro/Elite
  AISection.tsx            -- Seccao dedicada a IA
  NichesSection.tsx        -- 3 nichos expandidos
  ResultsSection.tsx       -- Contadores animados
  TestimonialsSection.tsx  -- 3 testemunhos
  PricingSection.tsx       -- 3 planos reais do stripe-plans.ts
  ComparisonTable.tsx      -- Senvia vs Pipedrive vs HubSpot
  TrustSection.tsx         -- RGPD, UE, suporte PT
  FAQSection.tsx           -- 12 perguntas
  FinalCTA.tsx             -- CTA emocional + botao WhatsApp
  LandingFooter.tsx        -- 4 colunas completas
```

Ficheiro reescrito: `src/pages/Landing.tsx` (orquestra todos os componentes)

## Seccoes Detalhadas

### 1. AnnouncementBar
- Barra fina no topo: "Teste gratis durante 14 dias. Sem cartao de credito."
- Dismissable com X

### 2. LandingHeader
- Desktop: Logo | Funcionalidades | Precos | Para Quem | FAQ || "Area do Cliente" (outline) | "Testar Gratis" (primary)
- Mobile: Logo | Hamburger -> Drawer full-screen
- Sticky com backdrop-blur

### 3. HeroSection
- Headline: "Os seus leads sao atendidos em segundos. Mesmo as 3 da manha."
- Sub-headline com checkmarks (IA, WhatsApp, CRM, RGPD)
- **CTA Principal**: "Testar Gratis 14 Dias" -> link para `/login` (registo)
- **CTA Secundario**: "Ver Como Funciona" (scroll para seccao de passos)
- Badge: "14 dias gratis | Sem cartao de credito"
- Mockup de telefone WhatsApp (manter o atual)
- Contadores animados: "<5s", "100%", "24/7", "0 leads perdidos"

### 4. SocialProofBar
- Badges: "Conforme RGPD", "Made in Portugal", "Dados na UE"
- Texto: "Utilizado por clinicas, imobiliarias e empresas de servicos"

### 5. ProblemSection
- Manter os 3 pain points atuais (Leads Misturados, Sem Visibilidade, O Vacuo)
- Melhorar visual com animacoes de entrada

### 6. SolutionSteps
- 3 passos (Capture -> Nurture -> Close) estilo GoHighLevel
- Cada passo com screenshot do produto real ao lado
- Alternando esquerda/direita no desktop

### 7. DemoShowcase (Tabs Interativas)
- 5 Tabs: CRM Kanban | Dashboard | Calendario | Marketing | Financeiro
- Cada tab com screenshot + 3 bullet points
- Badge "Pro"/"Elite" nas tabs de planos superiores

### 8. FeaturesGrid
- Grid 2x4 com 8 features (icone + titulo + descricao + badge de plano)
- CRM, WhatsApp, IA, Formularios, Marketing (Pro), Calendario, Financeiro (Elite), E-commerce (Elite)

### 9. AISection
- "Conheca a IA do Senvia OS"
- Fluxo visual da classificacao: Lead -> IA analisa -> Quente/Morno/Frio
- Sub-features da IA

### 10. NichesSection
- 3 nichos expandidos com caso de uso real e especifico
- Clinicas, Construcao, Imobiliaria

### 11. ResultsSection
- 4 metricas grandes com animacao de contagem
- "<5 seg", "100%", "0", "24/7"

### 12. TestimonialsSection
- 3 testemunhos placeholder (clinica, imobiliaria, construcao)
- Foto, nome, cargo, empresa, estrelas

### 13. PricingSection
- 3 planos reais de `stripe-plans.ts` (Starter 49eur, Pro 99eur, Elite 147eur)
- Lista de features com checkmarks
- Badge "Mais Popular" no Pro
- **CTA em cada plano**: "Comecar Teste Gratis" -> `/login`
- Nota: "14 dias gratis. Sem cartao de credito."

### 14. ComparisonTable
- Senvia vs Pipedrive vs HubSpot vs Excel+WhatsApp
- Criterios: WhatsApp, IA, PT-PT, Suporte local, Preco, RGPD

### 15. TrustSection
- 5 badges: RGPD, UE, PT, Cancelamento livre, Trial 14 dias

### 16. FAQSection
- 12 perguntas (4 atuais + 8 novas)
- Incluir pergunta sobre o trial: "Preciso de cartao de credito para testar?"

### 17. FinalCTA
- "Cada minuto que passa, outro lead fica sem resposta."
- **CTA Principal**: "Comecar Teste Gratis" -> `/login`
- **CTA Secundario**: Botao WhatsApp "Receber Mensagem de Teste" (manter)
- Micro-texto: "14 dias gratis. Sem compromisso. Sem cartao."

### 18. LandingFooter
- 4 colunas: Senvia | Produto | Empresa | Legal
- Redes sociais, copyright, "Feito em Portugal"

## Detalhes Tecnicos

### Tecnologias (tudo ja instalado)
- `framer-motion` -- Animacoes de scroll (useInView)
- `lucide-react` -- Icones
- `react-helmet-async` -- SEO
- Shadcn UI -- Cards, Buttons, Tabs, Accordion
- Tailwind CSS -- Estilos

### Estrategia de CTA
Todos os CTAs "Testar Gratis" apontam para `/login` onde o utilizador faz registo e entra automaticamente no trial de 14 dias (ja implementado no sistema). Nao e necessario criar nenhum fluxo novo.

### SEO
- Schema.org: FAQPage, SoftwareApplication, Organization
- Open Graph e Twitter Cards
- H1 unico, H2 por seccao

### Mobile-First
- Todas as grids colapsam para 1 coluna
- Header com drawer mobile
- Tabs viram scroll horizontal
- Botoes full-width em mobile

### Alteracao de Rotas em App.tsx
A rota `/` passa de `<Login />` para `<Landing />`. O login continua acessivel via `/login` e via botao "Area do Cliente" no header.

### Ficheiros Alterados
- `src/App.tsx` -- Alterar rota raiz
- `src/pages/Landing.tsx` -- Reescrita total
- 16 componentes novos em `src/components/landing/`

Nao sao necessarias alteracoes de base de dados nem edge functions.
