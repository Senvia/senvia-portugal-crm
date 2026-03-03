

## Adicionar gatilhos de mudança de status para Vendas e Propostas nas Automações

### Situação atual
O sistema de automações já existe em `/marketing/automations` e suporta gatilhos como `lead_created`, `lead_status_changed`, `sale_created`, `proposal_created`. Porém **faltam dois gatilhos essenciais**:
- `sale_status_changed` — quando uma venda muda de status (Ex: Em Progresso → Entregue)
- `proposal_status_changed` — quando uma proposta muda de status (Ex: Enviada → Aceite)

### Plano

**1. `src/hooks/useAutomations.ts`** — Adicionar os novos trigger types:
```typescript
{ value: 'sale_status_changed', label: 'Venda Muda de Estado' },
{ value: 'proposal_status_changed', label: 'Proposta Muda de Estado' },
```

**2. `src/components/marketing/CreateAutomationModal.tsx`** — Adaptar o UI de configuração de status:
- Expandir `showStatusConfig` para incluir `sale_status_changed` e `proposal_status_changed`
- Quando o gatilho for `sale_status_changed`, mostrar os estados de venda (Em Progresso, Entregue, Concluída, Cancelado) em vez dos pipeline stages
- Quando for `proposal_status_changed`, mostrar os estados de proposta (Rascunho, Enviada, Em Negociação, Aceite, Recusada, Expirada)
- Quando for `lead_status_changed` ou `client_status_changed`, manter o comportamento atual com pipeline stages

**3. `supabase/functions/process-automation/index.ts`** — Já suporta `trigger_config.to_status` e `trigger_config.from_status`, portanto funciona automaticamente para os novos tipos sem alterações.

**4. Disparo dos gatilhos** — Verificar onde as vendas e propostas mudam de status nos hooks (`useSales.ts`, `useProposals.ts`) e invocar a edge function `process-automation` após a mudança, tal como já é feito para leads.

### Detalhes técnicos
- Estados de Venda: `in_progress`, `fulfilled`, `delivered`, `cancelled`
- Estados de Proposta: `draft`, `sent`, `negotiating`, `accepted`, `rejected`, `expired`
- A edge function `process-automation` já implementa a lógica de `matchesTriggerConfig` que compara `from_status` / `to_status`, logo os novos gatilhos funcionam sem alteração no backend

