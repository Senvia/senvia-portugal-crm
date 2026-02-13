
# Estatisticas Completas de Marketing (estilo Brevo)

## Problema
A pagina de Relatorios atual so mostra 4 metricas (Enviados, Abertos, Clicados, Erros). Faltam metricas importantes como **Entregues**, **Bounces**, **Spam** e **Bloqueados**, alem de um **filtro por campanha**, um botao de **refresh** e uma **tabela de eventos detalhados**.

## Alteracoes

### 1. `src/hooks/useEmailStats.ts`
- Adicionar contagem dos novos estados: `delivered`, `bounced`, `spam`, `blocked`, `unsubscribed`
- Aceitar parametro opcional `campaignId` para filtrar por campanha
- Calcular `deliveredRate` (entregues / enviados)
- Incluir os novos campos no agrupamento diario

### 2. `src/pages/marketing/Reports.tsx`
Redesenhar completamente para incluir:

**Filtros no topo:**
- Dropdown para selecionar campanha (ou "Todas")
- Seletor de periodo (7d / 30d / 90d) - ja existe
- Botao de refresh para recarregar dados

**7 Cards de metricas (grid 2x4 mobile, 7 colunas desktop):**
1. Enviados (icone Send, cor neutra)
2. Entregues (icone CheckCircle, cor verde, com % taxa de entrega)
3. Abertos (icone Eye, cor azul, com % taxa de abertura)
4. Clicados (icone MousePointer, cor roxa, com % taxa de clique)
5. Bounces (icone AlertTriangle, cor amarela)
6. Spam (icone ShieldAlert, cor vermelha)
7. Bloqueados (icone Ban, cor cinza)

**Graficos (mantidos e melhorados):**
- Area chart com enviados + entregues + erros ao longo do tempo
- Bar chart com aberturas e cliques

**Tabela "Eventos Detalhados":**
- Lista os registos individuais de `email_sends` filtrados pelo periodo/campanha
- Colunas: Destinatario, Email, Estado, Enviado em, Aberto em, Clicado em
- Badge de estado com cores (Enviado, Entregue, Aberto, Clicado, Bounce, Spam, Bloqueado)
- Paginacao simples ou scroll

### 3. `src/types/marketing.ts`
- Adicionar constantes `EMAIL_SEND_STATUS_LABELS` e `EMAIL_SEND_STATUS_STYLES` para os estados: sent, delivered, opened, clicked, bounced, spam, blocked, unsubscribed, failed

## Ficheiros alterados
- `src/hooks/useEmailStats.ts` - novos campos e filtro por campanha
- `src/pages/marketing/Reports.tsx` - redesenho completo
- `src/types/marketing.ts` - constantes de estado dos envios
