## Toggle "Energias" no Módulos (Telecom Only)

### Estado: ✅ Implementado

### Alterações Realizadas

**1. `src/hooks/useModules.ts`**
- Adicionado `energy: boolean` ao `EnabledModules` (default: `true`)

**2. `src/components/settings/ModulesTab.tsx`**
- Adicionado card especial "Energias" com ícone ⚡ que só renderiza quando `organization.niche === 'telecom'`
- Badge "Telecom" para identificar que é exclusivo do nicho

**3. Componentes atualizados com `showEnergy = isTelecom && modules.energy`:**

| Ficheiro | O que é ocultado quando energy=off |
|---|---|
| `src/pages/Leads.tsx` | Filtro de tipologia |
| `src/components/leads/AddLeadModal.tsx` | Campos tipologia, consumo_anual, summary |
| `src/components/leads/LeadDetailsModal.tsx` | Secção tipologia, card consumo_anual |
| `src/components/leads/LeadCard.tsx` | Badge tipologia, consumo_anual |
| `src/components/leads/LeadsTableView.tsx` | Coluna tipologia, coluna consumo |
| `src/components/proposals/CreateProposalModal.tsx` | Tipo de proposta selector (energia) |
| `src/components/proposals/EditProposalModal.tsx` | Tipo de proposta, CPE selector energia |
| `src/components/proposals/ProposalDetailsModal.tsx` | CPEs, consumo total, resumo energia, badges energia |
| `src/components/sales/CreateSaleModal.tsx` | Dados energia, CPE/CUI |
| `src/components/sales/EditSaleModal.tsx` | Dados energia editáveis |
| `src/components/sales/SaleDetailsModal.tsx` | Dados energia, CPEs |
| `src/components/clients/ClientDetailsModal.tsx` | Stats MWh/kWp/Comissão |
| `src/pages/Clients.tsx` | Filtro tipo proposta (energia/servicos) |

**Nota**: Funcionalidades gerais de telecom (empresa, serviços, ativação, anexos) continuam visíveis independentemente do toggle de energia.
