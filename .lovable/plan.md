

# Painel Super Admin: Clientes e Pagamentos do Senvia OS

## Objetivo
Expandir o painel Super Admin com duas novas secoes:
1. **Tabela completa de Clientes Senvia OS** (todas as organizacoes com detalhes de plano, trial, membros)
2. **Resumo de Receita Mensal** (MRR baseado nos planos ativos)

## O que existe hoje
- Cards simples com contagem de organizacoes e leads
- Lista de acesso rapido a organizacoes (so nome, slug e membros)
- Sem informacao de planos, trials ou receita

## O que sera adicionado

### 1. Cards de Metricas Novos
- **MRR (Monthly Recurring Revenue)**: soma dos valores mensais de todas as organizacoes com plano ativo
- **Clientes em Trial**: contagem de orgs com `trial_ends_at > now()` e sem subscricao Stripe
- **Trials Expirados**: orgs com trial expirado e sem plano pago
- **Clientes Pagantes**: orgs com plano != null e != basic (ou com `billing_exempt`)

### 2. Tabela de Clientes Senvia OS
Uma tabela responsiva com todas as organizacoes, mostrando:
- Nome da organizacao
- Plano atual (Starter/Pro/Elite/Trial/Expirado)
- Badge visual por estado (trial, pago, expirado, isento)
- Data de criacao
- Membros
- Trial expira em / Dias restantes
- Botao de acesso rapido (entrar na org)

Filtros:
- Todos / Pagantes / Em Trial / Expirados / Isentos

### 3. Card de Receita Mensal (MRR)
Calculo local baseado no plano de cada org:
- Starter = 49 EUR
- Pro = 99 EUR
- Elite = 147 EUR
- billing_exempt = 0 EUR (isento)
- trial/null = 0 EUR

---

## Detalhes Tecnicos

### Ficheiros a criar
- `src/components/system-admin/AdminMetricsCards.tsx` — cards de metricas (MRR, pagantes, trials, expirados)
- `src/components/system-admin/OrganizationsTable.tsx` — tabela completa de organizacoes com filtros e badges

### Ficheiros a alterar
- `src/pages/system-admin/Dashboard.tsx` — substituir conteudo atual pelos novos componentes

### Dados necessarios
A query existente `get_all_organizations` retorna nome, slug, code e member_count. Precisamos tambem de `plan`, `trial_ends_at`, `billing_exempt` e `created_at`.

Opcao: query direta a tabela `organizations` (o super_admin tem RLS ALL access) em vez do RPC:

```sql
SELECT id, name, slug, code, plan, trial_ends_at, billing_exempt, created_at
FROM organizations
ORDER BY created_at DESC
```

E para membros, um count separado ou join com `organization_members`.

### Calculo MRR
```typescript
const PLAN_PRICES = { starter: 49, pro: 99, elite: 147 };

const mrr = organizations.reduce((sum, org) => {
  if (org.billing_exempt) return sum;
  return sum + (PLAN_PRICES[org.plan] || 0);
}, 0);
```

### Filtros da Tabela
- **Pagantes**: `plan IN ('starter','pro','elite') AND NOT billing_exempt`
- **Em Trial**: `trial_ends_at > now() AND plan IS NULL` (ou plan = 'basic')
- **Expirados**: `trial_ends_at <= now() AND plan IS NULL`
- **Isentos**: `billing_exempt = true`

### Design
- Mobile-first, responsivo
- Dark mode (estilo Linear/Raycast existente)
- Badges coloridas por estado: verde (pago), azul (trial), vermelho (expirado), cinza (isento)
- Tabela com scroll horizontal em mobile
