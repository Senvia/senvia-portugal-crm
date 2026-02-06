

## Correcoes Template Telecom - CPE na Proposta

### Problemas Identificados

| # | Problema | Causa |
|---|----------|-------|
| 1 | Segundo CPE nao aparece ao editar | Timing do useEffect ao carregar CPEs existentes |
| 2 | Sumario nao soma CPEs no EditProposalModal | Falta o bloco de resumo que existe no CreateProposalModal |
| 3 | Margem no topo mostra texto errado | Campos legacy da proposta com valores incorretos a serem exibidos |

---

### Alteracoes Propostas

| Ficheiro | Alteracao |
|----------|-----------|
| `src/components/proposals/EditProposalModal.tsx` | Adicionar bloco de sumario igual ao CreateProposalModal |
| `src/components/proposals/EditProposalModal.tsx` | Melhorar logica de carregamento de CPEs |
| `src/components/proposals/EditProposalModal.tsx` | Calcular total de margem e comissao separadamente |

---

### Detalhes Tecnicos

#### 1. Adicionar Bloco de Sumario no EditProposalModal (linhas ~680)

Adicionar o mesmo bloco de resumo que existe no CreateProposalModal antes das Observacoes:

```typescript
{/* Summary - Apenas telecom energia */}
{isTelecom && proposalType === 'energia' && proposalCpes.length > 0 && (
  <div className="p-3 rounded-lg bg-muted text-sm">
    <div className="flex justify-between">
      <span>CPE/CUI adicionados:</span>
      <span className="font-medium">{proposalCpes.length}</span>
    </div>
    <div className="flex justify-between">
      <span>Margem Total:</span>
      <span className="font-medium text-primary">
        {formatCurrency(proposalCpes.reduce((sum, cpe) => sum + (parseFloat(cpe.margem) || 0), 0))}
      </span>
    </div>
    <div className="flex justify-between">
      <span>Comissao Total:</span>
      <span className="font-medium">
        {formatCurrency(proposalCpes.reduce((sum, cpe) => sum + (parseFloat(cpe.comissao) || 0), 0))}
      </span>
    </div>
  </div>
)}
```

#### 2. Corrigir Calculo do totalValue no EditProposalModal

Atualmente (linha 149-165), o calculo soma margem + comissao, mas deve somar apenas as margens (igual ao CreateProposalModal):

```typescript
// ANTES (incorreto - soma margem + comissao)
const totalValue = useMemo(() => {
  if (isTelecom) {
    if (proposalType === 'energia') {
      return proposalCpes.reduce((sum, cpe) => {
        const margem = parseFloat(cpe.margem) || 0;
        const comissao = parseFloat(cpe.comissao) || 0;
        return sum + margem + comissao;  // <-- INCORRETO
      }, 0);
    }
    // ...
  }
}, [...]);

// DEPOIS (correto - soma apenas margens)
const totalValue = useMemo(() => {
  if (isTelecom) {
    if (proposalType === 'energia') {
      return proposalCpes.reduce((sum, cpe) => sum + (parseFloat(cpe.margem) || 0), 0);
    }
    // ...
  }
}, [...]);
```

#### 3. Adicionar totalComissao no EditProposalModal

Adicionar calculo separado para comissao total:

```typescript
// Calcular total de comissao dos CPEs (telecom apenas)
const totalComissao = useMemo(() => {
  if (proposalType === 'energia') {
    return proposalCpes.reduce((sum, cpe) => sum + (parseFloat(cpe.comissao) || 0), 0);
  }
  return parseFloat(servicosComissao) || 0;
}, [proposalType, proposalCpes, servicosComissao]);
```

---

### Comportamento Final

| Cenario | Resultado |
|---------|-----------|
| Adicionar 1 CPE | Sumario mostra 1 CPE com margem e comissao |
| Adicionar 2 CPEs | Sumario mostra 2 CPEs com soma das margens e comissoes |
| Editar proposta existente | CPEs carregados corretamente com sumario visivel |
| Valor Total da Proposta | Soma apenas das margens (nao inclui comissao) |

---

### Nota sobre "Margem no Topo"

Se o problema persistir apos estas alteracoes, podera ser necessario verificar:
1. Se existem dados legacy na tabela `proposals` (campos `margem`, `consumo_anual`) que precisam de ser limpos
2. Se ha algum componente a exibir esses campos legacy em vez dos dados dos CPEs

**Total: 1 ficheiro modificado (EditProposalModal.tsx)**

