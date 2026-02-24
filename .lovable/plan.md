

# Adicionar card "Clientes Bronze" (Ativos) na pagina de Clientes

## Contexto

A pagina de Clientes tem atualmente 4 cards de estatisticas: Total, VIP/Ouro, Inativos/Prata e Valor Total. Falta o card para clientes com status "active", que no nicho Telecom se chama "Bronze".

O sistema de labels por nicho ja esta configurado corretamente:
- Telecom: active = "Bronze", inactive = "Prata", vip = "Ouro"
- Outros nichos: active = "Ativo", inactive = "Inativo", vip = "VIP"

## Alteracoes

### 1. Clients.tsx -- Adicionar card Bronze/Ativos

Adicionar um novo card na grelha de estatisticas entre o card "Total" e o card "VIP/Ouro". Este card mostra o numero de clientes com status `active`, usando o label dinamico do nicho (ex: "Clientes Bronze" para telecom, "Clientes Ativos" para outros).

- Icone: Shield ou UserCheck (representacao de nivel basico/ativo)
- Cor: Azul (bg-blue-500/10, text-blue-500) para diferenciar dos outros cards
- Valor: `stats.active` (ja existe no hook `useClientStats`)

A grelha passa de 4 para 5 cards. Para manter responsividade mobile-first:
- Mobile: `grid-cols-2` (2x3, ultimo card ocupa largura total ou grid de 2)
- Desktop: `grid-cols-5`

### 2. useClientStats -- Sem alteracao necessaria

O hook `useClientStats` ja calcula `stats.active`, portanto nao precisa de alteracao.

### 3. Niche labels -- Sem alteracao necessaria

Os labels ja estao configurados em `niche-labels.ts` com `active: 'Clientes Bronze'` para telecom.

## Secao tecnica

### Ficheiros alterados

1. **`src/pages/Clients.tsx`** -- Adicionar novo `<Card>` na grelha de stats com `stats.active` e `labels.active`

### Layout da grelha (apos alteracao)

```text
Mobile (grid-cols-2):
[Total]   [Bronze]
[Ouro]    [Prata]
[Valor Total - col-span-2]

Desktop (grid-cols-5):
[Total] [Bronze] [Ouro] [Prata] [Valor Total]
```

