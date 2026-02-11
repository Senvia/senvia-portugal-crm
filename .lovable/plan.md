

## Renomear "Estado" para "Tipologia" com valores Bronze/Prata/Ouro (apenas Telecom)

### O que muda

No nicho **telecom**, o campo "Estado" do cliente passa a chamar-se **"Tipologia"** e os valores mudam de Ativo/Inativo/VIP para **Bronze/Prata/Ouro**. Todos os outros nichos continuam iguais.

Os valores internos na base de dados nao mudam (`active`, `inactive`, `vip`) -- apenas as etiquetas visuais sao diferentes no telecom.

### Mapeamento telecom

| Valor BD | Label generico | Label telecom |
|----------|---------------|---------------|
| active   | Ativo         | Bronze        |
| inactive | Inativo       | Prata         |
| vip      | VIP           | Ouro          |

O campo passa de "Estado" para "Tipologia".

### Ficheiros a alterar

**1. `src/lib/niche-labels.ts`**
- Adicionar campos ao `NicheLabels`: `statusFieldLabel`, `statusActive`, `statusInactive`, `statusVip`
- Valores genericos: `statusFieldLabel: 'Estado'`, `statusActive: 'Ativo'`, `statusInactive: 'Inativo'`, `statusVip: 'VIP'`
- Valores telecom: `statusFieldLabel: 'Tipologia'`, `statusActive: 'Bronze'`, `statusInactive: 'Prata'`, `statusVip: 'Ouro'`
- Atualizar os labels dos stats tambem no telecom: `vip: 'Clientes Ouro'`, `active: 'Clientes Bronze'`, `inactive: 'Clientes Prata'`

**2. `src/components/clients/CreateClientModal.tsx`**
- Importar e usar `useClientLabels` para obter os labels
- Trocar `<Label>Estado</Label>` por `<Label>{labels.statusFieldLabel}</Label>`
- Trocar `CLIENT_STATUS_LABELS` no Select por mapeamento dinamico usando os labels do niche

**3. `src/components/clients/EditClientModal.tsx`**
- Mesma alteracao que o CreateClientModal

**4. `src/components/clients/ClientsTable.tsx`**
- Usar `useClientLabels` para renderizar o badge com o label correto do niche em vez de `CLIENT_STATUS_LABELS`

**5. `src/components/clients/ClientDetailsModal.tsx`**
- Usar `useClientLabels` para o badge de status

**6. `src/components/clients/ClientFilters.tsx`**
- Ja usa `labels.active`, `labels.vip`, `labels.inactive` -- estes serao automaticamente atualizados quando o niche-labels mudar

**7. `src/pages/Clients.tsx`**
- Os cards de stats ja usam `labels.vip`, `labels.inactive` -- serao atualizados automaticamente

**8. `src/components/marketing/SendTemplateModal.tsx`**
- Usa `CLIENT_STATUS_LABELS` para filtrar clientes por estado -- substituir pelo hook

**9. `src/lib/export.ts`**
- O export de clientes usa labels hardcoded -- aceitar labels como parametro ou manter generico (menor prioridade)

### Estilos visuais (telecom)

Os estilos dos badges tambem mudam para refletir a hierarquia metalica:
- **Bronze**: tom castanho/cobre (amber)
- **Prata**: tom cinzento/neutro (muted)
- **Ouro**: tom dourado (warning/yellow)

Isto sera feito criando um `getClientStatusStyles` que retorna estilos baseados no niche, sem alterar os valores da BD.
