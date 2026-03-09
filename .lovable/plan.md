

## Plano: Toggle "Energias" no Módulos (Telecom Only)

### Conceito
Adicionar um toggle "Energias" na tab Módulos que só aparece para organizações do nicho `telecom`. Quando desativado, oculta tudo relacionado a energia em Leads, Propostas, Vendas e Clientes.

### Alterações

**1. `src/hooks/useModules.ts`**
- Adicionar `energy: boolean` ao `EnabledModules` (default: `true`)

**2. `src/components/settings/ModulesTab.tsx`**
- Adicionar card especial "Energias" com ícone ⚡ que só renderiza quando `organization.niche === 'telecom'`
- Descrição: "Campos de energia (EE, Gás), CPEs, consumo anual e tipologia"

**3. Componentes que precisam verificar `modules.energy`:**

Onde `isTelecom` controla features de energia, adicionar `&& modules.energy`:

| Ficheiro | O que esconder |
|---|---|
| `src/pages/Leads.tsx` | Filtro de tipologia, coluna tipologia |
| `src/components/leads/AddLeadModal.tsx` | Campos tipologia e consumo_anual |
| `src/components/leads/LeadDetailsModal.tsx` | Secção tipologia e consumo_anual |
| `src/components/leads/LeadCard.tsx` | Badge de tipologia |
| `src/components/leads/LeadsTableView.tsx` | Coluna tipologia |
| `src/components/proposals/CreateProposalModal.tsx` | Tipo proposta energia, CPE selector |
| `src/components/proposals/EditProposalModal.tsx` | Tipo proposta energia, CPE selector |
| `src/components/proposals/ProposalDetailsModal.tsx` | Secções de energia |
| `src/components/proposals/ProposalsList.tsx` | Filtro tipo, badge energia |
| `src/components/sales/CreateSaleModal.tsx` | Campos energia |
| `src/components/sales/EditSaleModal.tsx` | Campos energia |
| `src/components/sales/SaleDetailsModal.tsx` | Secção energia |
| `src/components/clients/ClientDetailsModal.tsx` | Tab CPE/CUI |
| `src/pages/Clients.tsx` | Filtro tipo energia |

**Abordagem**: Em cada ficheiro, substituir `isTelecom` por `isTelecom && modules.energy` apenas nos blocos que são específicos de **energia** (não de serviços). Blocos que mostram features de serviços telecom continuam visíveis.

**Nota**: O `useModules()` hook já existe e é usado globalmente, portanto basta importá-lo nos componentes necessários. Quando `energy` está desativado, o `proposal_type` default passa a ser `'servicos'` nos modais de criação.

