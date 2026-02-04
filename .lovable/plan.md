

## Reestruturação do Módulo de Propostas (Telecom/Energia)

### Resumo das Alterações Pedidas

O utilizador pretende reestruturar o fluxo de criação de propostas para organizações "telecom" (energia) com as seguintes alterações:

1. **Novo campo "Tipo de Negociação"**: Angariação, Angariação Indexado, Renovação, Angariação sem Volume
2. **Fluxo CPE primeiro**: Primeiro selecionar o CPE/CUI, depois aparecem os dados de energia para cada CPE
3. **Dados de Energia por CPE**:
   - "Anos do Contrato" → "Duração do Contrato"
   - Adicionar "Início do Contrato" e "Final do Contrato"
   - **Margem calculada automaticamente**: consumo_anual × duração_contrato × DBL
4. **Múltiplos CPE/CUI**: Cada CPE adicionado mostra o seu próprio bloco de dados de energia
5. **"Outros Serviços"**: Produtos fixos (Solar, Carregadores/Baterias, Condensadores, Coberturas) - sem valores
6. **Remover**: Produtos/Serviços com valores (secção de preços)

---

### Novo Fluxo de Criação de Proposta

```text
┌─────────────────────────────────────────┐
│  Nova Proposta                          │
├─────────────────────────────────────────┤
│                                         │
│  👤 Cliente: [____________ ▼] [+]       │
│  📅 Data: [2024-02-04]  Estado: [▼]     │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Tipo de Negociação                     │
│  ┌──────────────┐ ┌──────────────┐      │
│  │ Angariação   │ │ Ang.Indexado │      │
│  └──────────────┘ └──────────────┘      │
│  ┌──────────────┐ ┌──────────────┐      │
│  │ Renovação    │ │ Sem Volume   │      │
│  └──────────────┘ └──────────────┘      │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Tipo de Proposta                       │
│  [⚡ Energia]  [🔧 Outros Serviços]     │
│                                         │
│  ═════════════════════════════════════  │
│                                         │
│  SE ENERGIA:                            │
│  ┌─────────────────────────────────┐    │
│  │ ⚡ CPE/CUI #1                    │    │
│  ├─────────────────────────────────┤    │
│  │ Tipo: [▼ Energia]               │    │
│  │ Comercializador: [▼ EDP]        │    │
│  │ CPE/CUI: [PT0002...]            │    │
│  ├─────────────────────────────────┤    │
│  │ Consumo Anual: [15000] kWh      │    │
│  │ Duração: [2] anos               │    │
│  │ DBL: [5.50]                     │    │
│  │ Margem: 165.000€ (calculado)    │    │
│  │ Comissão: [150] €               │    │
│  ├─────────────────────────────────┤    │
│  │ Início: [2024-02-04]            │    │
│  │ Final:  [2026-02-04]            │    │
│  │ [× Remover]                     │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [+ Adicionar CPE/CUI]                  │
│                                         │
│  ═════════════════════════════════════  │
│                                         │
│  SE OUTROS SERVIÇOS:                    │
│  ┌─────────────────────────────────┐    │
│  │ 🔧 Produtos                      │    │
│  ├─────────────────────────────────┤    │
│  │ ☐ Solar                         │    │
│  │ ☐ Carregadores/Baterias         │    │
│  │ ☐ Condensadores                 │    │
│  │ ☐ Coberturas                    │    │
│  ├─────────────────────────────────┤    │
│  │ Potência (kWp): [___]           │    │
│  │ Comissão: [___] €               │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Notas: [________________________]      │
│                                         │
│  [Cancelar]          [Criar Proposta]   │
│                                         │
└─────────────────────────────────────────┘
```

---

### Estrutura de Dados por CPE/CUI

Cada CPE na proposta terá os seus próprios dados de energia:

| Campo | Descrição | Tipo |
|-------|-----------|------|
| equipment_type | Tipo (Energia/Gás/Outro) | string |
| serial_number | CPE/CUI | string |
| comercializador | Fornecedor | string |
| consumo_anual | Consumo anual em kWh | number |
| duracao_contrato | Duração em anos | number |
| dbl | DBL (€/MWh) | number |
| margem | **Calculado**: consumo × duração × DBL | number |
| comissao | Comissão em € | number |
| contrato_inicio | Data início contrato | date |
| contrato_fim | Data fim contrato | date |

---

### Cálculo Automático da Margem

```
Margem = Consumo Anual (kWh) × Duração (anos) × DBL (€/MWh) / 1000

Exemplo:
- Consumo: 15.000 kWh
- Duração: 2 anos
- DBL: 5.50 €/MWh
- Margem = 15.000 × 2 × 5.50 / 1000 = 165,00 €
```

---

### Alterações à Base de Dados

**Tabela `proposals`** - Adicionar:
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `negotiation_type` | text | 'angariacao', 'angariacao_indexado', 'renovacao', 'sem_volume' |

**Tabela `proposal_cpes`** - Adicionar:
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `consumo_anual` | numeric | Consumo anual em kWh |
| `duracao_contrato` | integer | Anos de contrato |
| `dbl` | numeric | DBL em €/MWh |
| `margem` | numeric | Margem calculada |
| `comissao` | numeric | Comissão em € |
| `contrato_inicio` | date | Início do contrato |
| `contrato_fim` | date | Fim do contrato |

---

### Produtos Fixos para "Outros Serviços"

Para organizações telecom, a lista de produtos será fixa:
- Solar
- Carregadores/Baterias
- Condensadores
- Coberturas

Será utilizado um array de checkboxes em vez da seleção de produtos com preços.

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/types/proposals.ts` | Adicionar `NegotiationType`, constantes e labels |
| `src/types/cpes.ts` | Adicionar `SERVICOS_PRODUCTS` para produtos fixos |
| `src/hooks/useProposalCpes.ts` | Atualizar interface com novos campos |
| `src/components/proposals/ProposalCpeSelector.tsx` | Reformular para incluir dados de energia por CPE |
| `src/components/proposals/CreateProposalModal.tsx` | Adicionar tipo negociação, remover produtos com valores, novo fluxo |
| `src/components/proposals/EditProposalModal.tsx` | Mesmas alterações |
| `src/components/proposals/ProposalDetailsModal.tsx` | Mostrar dados por CPE |
| `src/hooks/useProposals.ts` | Atualizar interfaces |
| **Migração SQL** | Adicionar novas colunas às tabelas |

---

### Tipos e Constantes Novas

```typescript
// types/proposals.ts
export type NegotiationType = 'angariacao' | 'angariacao_indexado' | 'renovacao' | 'sem_volume';

export const NEGOTIATION_TYPE_LABELS: Record<NegotiationType, string> = {
  angariacao: 'Angariação',
  angariacao_indexado: 'Angariação Indexado',
  renovacao: 'Renovação',
  sem_volume: 'Angariação sem Volume',
};

// types/cpes.ts
export const SERVICOS_PRODUCTS = [
  'Solar',
  'Carregadores/Baterias',
  'Condensadores',
  'Coberturas',
];
```

---

### Interface do CPE com Dados de Energia

```typescript
interface ProposalCpeDraft {
  id: string;
  existing_cpe_id: string | null;
  equipment_type: string;
  serial_number: string;
  comercializador: string;
  
  // Dados de energia por CPE
  consumo_anual: string;
  duracao_contrato: string;
  dbl: string;
  margem: string; // Calculado automaticamente
  comissao: string;
  contrato_inicio: string;
  contrato_fim: string;
  
  notes: string;
  isNew: boolean;
}
```

---

### Remover da Interface

- Secção de Produtos/Serviços com valores editáveis (para Energia)
- Campos "Valor Adicional" e "Desconto"
- Total da Proposta calculado por produtos
- Os campos `consumo_anual`, `margem`, `dbl`, `anos_contrato` ao nível da proposta (movem-se para cada CPE)

---

### SQL Migration

```sql
-- Adicionar tipo de negociação à tabela proposals
ALTER TABLE proposals 
ADD COLUMN negotiation_type text DEFAULT NULL;

-- Adicionar campos de energia a cada CPE
ALTER TABLE proposal_cpes 
ADD COLUMN consumo_anual numeric DEFAULT NULL,
ADD COLUMN duracao_contrato integer DEFAULT NULL,
ADD COLUMN dbl numeric DEFAULT NULL,
ADD COLUMN margem numeric DEFAULT NULL,
ADD COLUMN comissao numeric DEFAULT NULL,
ADD COLUMN contrato_inicio date DEFAULT NULL,
ADD COLUMN contrato_fim date DEFAULT NULL;
```

---

### Resultado Esperado

1. **Novo fluxo de proposta** com seleção de tipo de negociação
2. **Cada CPE tem os seus próprios dados** de consumo, duração, DBL, margem e datas
3. **Margem calculada automaticamente** quando consumo, duração e DBL são preenchidos
4. **Botão "+ CPE/CUI"** para adicionar múltiplos pontos de consumo
5. **Produtos fixos** para Outros Serviços (sem valores)
6. **Aplicado apenas a organizações telecom** (niche === 'telecom')

