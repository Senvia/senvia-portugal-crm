

## Somatório de Energia / kWp no "Total da Proposta" (Telecom)

### O que muda

No bloco principal azul do modal de detalhes da proposta (e no template de impressão), além do "Consumo Total MWh" já implementado, vão aparecer **métricas resumo adicionais** conforme o tipo de proposta:

- **Tipo Energia**: Mostrar abaixo do Consumo Total MWh:
  - **Margem Total** (soma das margens de todos os CPEs)
  - **Comissão Total** (soma das comissões de todos os CPEs)

- **Tipo Serviços**: Mostrar:
  - **kWp Total** (campo `kwp` da proposta)
  - **Comissão** (campo `comissao` da proposta)

Isto permite ver de relance os totais financeiros e técnicos sem precisar de abrir cada CPE individualmente.

### Layout proposto

O bloco azul principal fica assim (telecom):

```text
┌──────────────────────────────────────┐
│ Consumo Total MWh          Data      │
│ 12,5 MWh                  10 Fev     │
│                                      │
│ Margem Total: 1.250,00 €            │
│ Comissão Total: 450,00 €            │
└──────────────────────────────────────┘
```

Para tipo "Serviços", em vez de Margem/Comissão dos CPEs, mostra kWp e Comissão do nível da proposta.

### Secção técnica

#### Ficheiro a alterar

`src/components/proposals/ProposalDetailsModal.tsx`

#### 1. No bloco do modal (linhas ~494-500)

Depois do `<p>` com Consumo Total MWh, adicionar uma linha secundária com os totais:

```typescript
// Energia: somar margem e comissão de todos os CPEs
const margemTotal = proposalCpes.reduce((sum, cpe) => sum + (Number(cpe.margem) || 0), 0);
const comissaoTotal = proposalCpes.reduce((sum, cpe) => sum + (Number(cpe.comissao) || 0), 0);
```

Renderizar abaixo do valor principal como texto mais pequeno:
- Se `proposal_type === 'energia'`: "Margem Total: X € | Comissão Total: Y €"
- Se `proposal_type === 'servicos'`: "kWp: Z | Comissão: W €"

#### 2. No template de impressão HTML (linhas ~380-386)

Adicionar a mesma informação secundária abaixo do valor principal no `total-box`, usando um `<div>` com estilo mais pequeno.

#### Resumo de alterações

| Ficheiro | Alteração |
|---|---|
| `src/components/proposals/ProposalDetailsModal.tsx` | Adicionar linha de resumo (margem/comissão ou kWp) no bloco azul do modal e no HTML de impressão |

Nenhuma alteração de base de dados necessária — os dados já existem nos CPEs e na proposta.
