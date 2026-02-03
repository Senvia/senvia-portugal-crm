

## Adaptar CPE/CUI para Template de Telecomunicações

### Resumo
Adaptar a secção de CPE para **CPE/CUI** (Código de Ponto de Entrega / Código Universal de Instalação - energia), mas **apenas para organizações com o template de telecomunicações** (`niche === 'telecom'`). Outras organizações continuam a ver a versão genérica.

---

### Lógica Condicional

A aplicação já usa o padrão `organization?.niche === 'telecom'` para customizações específicas (ver Leads). Vamos aplicar a mesma lógica nos componentes de CPE.

---

### Alterações Condicionais (Apenas Telecom)

| Elemento | Versão Genérica | Versão Telecom |
|----------|----------------|----------------|
| Tab no Drawer | CPEs (X) | CPE/CUI (X) |
| Título secção | Equipamentos (CPE) | Pontos de Consumo (CPE/CUI) |
| Título modal criar | Adicionar CPE | Adicionar CPE/CUI |
| Título modal editar | Editar CPE | Editar CPE/CUI |
| Campo "Tipo de Equipamento" | Lista: Router, ONT, etc. | Lista: Energia, Gás, Outro |
| Campo "Número de Série" | Nº Série / S/N | Local de Consumo (CPE/CUI) |
| Comercializadores | Lista mista (MEO, EDP...) | Lista E-Redes (EDP, Galp, Endesa...) |
| Placeholder S/N | Ex: SN123456789 | Ex: PT0002000012345678XX |

---

### Alterações na Ficha de Cliente (Telecom)

Na secção de Resumo do `ClientDetailsDrawer`:
- Mover a secção **Empresa** para antes do Contacto
- Dar destaque visual à empresa como informação principal

---

### Ficheiros a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/types/cpes.ts` | Adicionar constantes `ENERGY_TYPES` e `ENERGY_COMERCIALIZADORES` para telecom |
| `src/components/clients/CpeList.tsx` | Usar labels condicionais baseadas no niche |
| `src/components/clients/CreateCpeModal.tsx` | Passar prop `isTelecom` e ajustar labels/listas |
| `src/components/clients/EditCpeModal.tsx` | Passar prop `isTelecom` e ajustar labels/listas |
| `src/components/clients/ClientDetailsDrawer.tsx` | Condicional para renomear tab e reorganizar Empresa |
| `src/components/proposals/ProposalCpeSelector.tsx` | Condicional para labels e listas de comercializadores |

---

### Detalhes Técnicos

**Novas constantes em `src/types/cpes.ts`:**
```typescript
// Tipos de energia para template telecom (mercado energético)
export const ENERGY_TYPES = [
  'Energia',
  'Gás',
  'Outro',
];

// Comercializadores de energia em Portugal (E-Redes)
export const ENERGY_COMERCIALIZADORES = [
  'EDP Comercial',
  'Endesa Energia',
  'Galp Power',
  'Iberdrola',
  'Goldenergy',
  'Luzboa',
  'Repsol Energia',
  'SU Eletricidade',
  'Energia Unida',
  'Pleno Energia',
  'Nossa Energia',
  'Alfa Energia',
  'Axpo Energia',
  'Muon Electric',
  'Coopernico',
  'Outro',
];
```

**Padrão de uso nos componentes:**
```typescript
import { useAuth } from '@/contexts/AuthContext';

// Dentro do componente:
const { organization } = useAuth();
const isTelecom = organization?.niche === 'telecom';

// Labels condicionais:
const typeLabel = isTelecom ? 'Tipo' : 'Tipo de Equipamento';
const serialLabel = isTelecom ? 'Local de Consumo (CPE/CUI)' : 'Número de Série';
const serialPlaceholder = isTelecom ? 'Ex: PT0002000012345678XX' : 'Ex: SN123456789';
const typeOptions = isTelecom ? ENERGY_TYPES : EQUIPMENT_TYPES;
const comercializadorOptions = isTelecom ? ENERGY_COMERCIALIZADORES : COMERCIALIZADORES;
```

---

### Estrutura Visual

**Ficha de Cliente - Resumo (Telecom):**
```text
┌─────────────────────────────────────┐
│  Nome Cliente        #CLI001        │
│  ◉ Ativo   Desde 01/01/2024         │
├─────────────────────────────────────┤
│  [ Métricas: Propostas | Vendas ]   │
├─────────────────────────────────────┤
│  ▸ Empresa (primeira secção)        │
│    🏢 Nome da Empresa               │
│    📄 NIF: 123456789                │
├─────────────────────────────────────┤
│  ▸ Contacto                         │
│    ✉️ email@exemplo.com              │
│    📞 +351 912 345 678              │
└─────────────────────────────────────┘
```

**Tab CPE/CUI (Telecom):**
```text
┌─────────────────────────────────────┐
│  📡 Pontos de Consumo (CPE/CUI)     │
├─────────────────────────────────────┤
│  Energia | EDP Comercial            │
│  CPE/CUI: PT0002000012345678XX      │
│  📅 01/01/2024 → 31/12/2026         │
│  🏷️ 2a restantes                    │
└─────────────────────────────────────┘
```

---

### Ordem de Implementação

1. Adicionar constantes `ENERGY_TYPES` e `ENERGY_COMERCIALIZADORES` em `src/types/cpes.ts`
2. Atualizar `CpeList.tsx` com labels condicionais
3. Atualizar `CreateCpeModal.tsx` com props e lógica condicional
4. Atualizar `EditCpeModal.tsx` com props e lógica condicional
5. Atualizar `ClientDetailsDrawer.tsx` (tab name + reorganização Empresa)
6. Atualizar `ProposalCpeSelector.tsx` para consistência

---

### Resultado Esperado

- **Organizações Telecom**: Veem "CPE/CUI", "Local de Consumo", tipos "Energia/Gás", e comercializadores da E-Redes
- **Outras Organizações**: Continuam a ver a versão genérica com "CPE", "Número de Série", tipos de equipamento telecom
- A ficha de cliente telecom dá destaque à Empresa como informação principal

