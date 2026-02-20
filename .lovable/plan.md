

## Redesign da Pagina de Plano e Faturacao

### Objetivo
Transformar a pagina de billing de simples cards pequenos para seccoes grandes e detalhadas com aparencia premium, incluindo modulos, integracoes e limites de cada plano de forma clara.

### Alteracoes

#### 1. Atualizar dados dos planos (`src/lib/stripe-plans.ts`)

Expandir a interface `StripePlan` para incluir:
- **`description`**: frase curta sobre o plano
- **`modules`**: lista de modulos incluidos (ex: "CRM Base", "Marketing", "Financeiro")
- **`integrations`**: lista de integracoes (ex: "WhatsApp", "Faturacao", "Meta Pixels")
- **`limits`**: objeto com `users` e `forms` (texto, ex: "Ate 10" ou "Ilimitados")

Conteudo atualizado dos planos:

**Starter (49EUR)**
- Modulos: CRM Base (Leads + Clientes), Calendario, Propostas
- Integracoes: nenhuma
- Limites: 10 utilizadores, 2 formularios

**Pro (99EUR)**
- Modulos: Tudo do Starter + Modulo Vendas, Modulo Marketing
- Integracoes: WhatsApp, Meta Pixels
- Limites: 15 utilizadores, 5 formularios

**Elite (147EUR)**
- Modulos: Tudo do Pro + Modulo Financeiro, Modulo E-commerce
- Integracoes: WhatsApp, Meta Pixels, Faturacao (InvoiceXpress)
- Limites: Utilizadores ilimitados, Formularios ilimitados

(Removido "Multi-organizacao" do Elite, adicionado "Formularios ilimitados" e "Modulo Faturacao")

#### 2. Redesign do componente BillingTab (`src/components/settings/BillingTab.tsx`)

Cada plano passa a ocupar uma seccao vertical grande em vez de um card pequeno, com:

- **Cabecalho premium**: nome do plano com badge (Plano Atual / Popular), preco grande e descricao
- **Seccao "Modulos Incluidos"**: lista com icones de check para cada modulo
- **Seccao "Integracoes"**: lista separada com icones especificos (MessageSquare para WhatsApp, etc.)
- **Seccao "Limites"**: utilizadores e formularios com icones (Users, FileText)
- **Botao de acao**: "Plano Atual", "Fazer Upgrade" ou "Gerir Subscricao"

Layout:
- Mobile: seccoes empilhadas verticalmente (1 coluna)
- Desktop: grid de 3 colunas com cards maiores e mais espaco

Estilo premium:
- Gradientes subtis no header de cada plano
- Border mais pronunciada no plano atual e no highlighted
- Separadores visuais entre seccoes (modulos, integracoes, limites)
- Icones contextuais para cada tipo de informacao

#### 3. Ficheiros alterados

| Ficheiro | Alteracao |
|----------|-----------|
| `src/lib/stripe-plans.ts` | Expandir interface e dados dos planos |
| `src/components/settings/BillingTab.tsx` | Redesign completo do layout |

Nenhuma alteracao de base de dados necessaria.
