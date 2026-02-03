

## Adaptar Separador de Vendas (Dados de Energia + CPE/CUI)

### Resumo
Modificar o modal de detalhes da venda para:
1. **Remover** a secção de "Valores e Cobranças" (Valor Total, Pagamento, etc.)
2. **Adicionar** secção de "Dados de Energia" (consumo, margem, anos contrato, etc.)
3. **Adicionar** secção de CPE/CUI associados à venda
4. Manter a atualização automática das permanências (já existe)

---

### O Que Será Removido

Do `SaleDetailsModal.tsx`:
- Campo editável "Valor Total"
- Secção "Informação de Pagamento" (método, vencimento, data pagamento, referência)
- Estado do Pagamento
- Subtotal/Desconto

---

### O Que Será Adicionado

**1. Secção "Dados de Energia"** (se `proposal_type === 'energia'`):
```text
┌─────────────────────────────────────┐
│ ⚡ Dados de Energia                  │
├─────────────────────────────────────┤
│ Consumo Anual: 15.000 kWh           │
│ Margem: 5,50 €/MWh                  │
│ Contrato: 2 anos                    │
│ DBL: 2.00                           │
│ Comissão: 150,00 €                  │
└─────────────────────────────────────┘
```

**2. Secção "Dados de Serviço"** (se `proposal_type === 'servicos'`):
```text
┌─────────────────────────────────────┐
│ 🔧 Dados do Serviço                 │
├─────────────────────────────────────┤
│ Modelo: Transacional                │
│ Potência: 10.5 kWp                  │
│ Comissão: 150,00 €                  │
└─────────────────────────────────────┘
```

**3. Secção "CPE/CUI"** (busca via `proposal_id`):
```text
┌─────────────────────────────────────┐
│ ⚡ CPE/CUI (Pontos de Consumo)       │
├─────────────────────────────────────┤
│ Energia | EDP Comercial | Novo      │
│ CPE/CUI: PT0002000012345678XX       │
│ Fidelização: 01/01/2024 → 31/12/2026│
├─────────────────────────────────────┤
│ Gás | Galp Power | Renovação        │
│ CPE/CUI: PT0003000012345678YY       │
│ Fidelização: 01/01/2024 → 31/12/2025│
└─────────────────────────────────────┘
```

---

### Lógica de Busca de CPEs

Como a venda pode ter `proposal_id`, buscar os CPEs de duas formas:
1. **Via proposta**: `proposal_cpes` onde `proposal_id = sale.proposal_id`
2. **Via cliente**: `cpes` onde `client_id = sale.client_id` (para mostrar CPEs atuais do cliente)

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/sales/SaleDetailsModal.tsx` | Remover valores/pagamento, adicionar Dados Energia e CPE/CUI |

---

### Estrutura Final do Modal

```text
┌─────────────────────────────────────┐
│  #SALE001    [Pendente]   2 Jan 2026│
├─────────────────────────────────────┤
│                                     │
│  Estado da Venda                    │
│  [▼ Pendente                    ]   │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  ⚡ Dados de Energia                 │
│  ┌───────────────────────────────┐  │
│  │ Consumo: 15.000 kWh           │  │
│  │ Margem: 5,50 €/MWh            │  │
│  │ Contrato: 2 anos | DBL: 2.00  │  │
│  │ Comissão: 150,00 €            │  │
│  └───────────────────────────────┘  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  ⚡ CPE/CUI                          │
│  ┌───────────────────────────────┐  │
│  │ Energia | EDP | Novo          │  │
│  │ PT0002000012345678XX          │  │
│  │ 01/01/24 → 31/12/26           │  │
│  └───────────────────────────────┘  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  📦 Produtos/Serviços               │
│  ┌───────────────────────────────┐  │
│  │ Contrato de Energia           │  │
│  │ 1 × 0,00 €           0,00 €   │  │
│  └───────────────────────────────┘  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  👤 Cliente                         │
│  ┌───────────────────────────────┐  │
│  │ Maria Silva  #CLI001          │  │
│  │ email@exemplo.com             │  │
│  │ +351 912 345 678  [WhatsApp]  │  │
│  └───────────────────────────────┘  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  📎 Proposta Associada              │
│  ┌───────────────────────────────┐  │
│  │ #PROP001 | 1 Jan 2026         │  │
│  └───────────────────────────────┘  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Notas                              │
│  ┌───────────────────────────────┐  │
│  │ Observações...                │  │
│  └───────────────────────────────┘  │
│                                     │
├─────────────────────────────────────┤
│  [🗑️ Eliminar Venda]               │
└─────────────────────────────────────┘
```

---

### Labels Condicionais (Telecom)

A secção de CPE/CUI usará labels condicionais baseadas no niche da organização:
- **Telecom**: "CPE/CUI (Pontos de Consumo)"
- **Outros**: "CPEs (Equipamentos)"

---

### Detalhes Técnicos

**Importações adicionais:**
```typescript
import { Zap, Wrench } from "lucide-react";
import { useProposalCpes } from "@/hooks/useProposalCpes";
import { useCpes } from "@/hooks/useCpes";
import { useAuth } from "@/contexts/AuthContext";
import { ENERGY_TYPES, ENERGY_COMERCIALIZADORES } from "@/types/cpes";
```

**Buscar CPEs via proposal_id:**
```typescript
const { data: proposalCpes = [] } = useProposalCpes(sale.proposal_id);
```

**Ou buscar CPEs do cliente:**
```typescript
const { data: clientCpes = [] } = useCpes(sale.client_id);
```

**Labels condicionais:**
```typescript
const { organization } = useAuth();
const isTelecom = organization?.niche === 'telecom';
const cpeLabel = isTelecom ? 'CPE/CUI (Pontos de Consumo)' : 'CPEs (Equipamentos)';
const serialLabel = isTelecom ? 'Local de Consumo' : 'Nº Série';
```

---

### Atualização Automática de Permanências

Esta funcionalidade **já existe** no `CreateSaleModal.tsx`:
- Quando a venda é criada, o código processa cada `proposalCpe`
- Se `existing_cpe_id` existe → atualiza o CPE existente (renovação)
- Se não existe → cria um novo CPE no cliente

O código atual (linhas 486-512) já faz isso automaticamente:
```typescript
if (proposalCpe.existing_cpe_id) {
  await updateCpe.mutateAsync({ ... });
} else {
  await createCpe.mutateAsync({ ... });
}
```

---

### Resultado Esperado

- Modal de vendas mostra Dados de Energia/Serviço em vez de valores/cobranças
- CPE/CUI associados são visíveis no detalhe da venda
- Labels adaptadas ao nicho da organização (Telecom = CPE/CUI)
- Atualização automática das permanências continua a funcionar

