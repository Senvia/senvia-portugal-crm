
## Ajustes no Template Telecom - Propostas

### Situacao atual

Verifiquei o codigo e **nenhuma das duas alteracoes esta implementada**:

1. **"Valor Total"** -- Aparece como valor monetario (EUR) tanto no modal de detalhes como no documento de impressao. O utilizador quer que no template telecom este campo mostre **"Consumo Total MWh"** com o calculo: soma dos consumos anuais dos CPEs / 1000.

2. **Badge "Renovacao"** -- Aparece em dois sitios:
   - `ProposalCpeSelector.tsx` (formulario de criacao/edicao) -- badge fixo "Renovacao" em todos os CPEs
   - `ProposalDetailsModal.tsx` (modal de detalhes) -- badge "Renovacao" quando o CPE esta ligado a um CPE existente

### O que vai mudar

**1. Substituir "Valor Total" por "Consumo Total MWh" (apenas telecom)**

- No **modal de detalhes** (`ProposalDetailsModal.tsx`): quando o nicho e telecom, o bloco azul principal mostra "Consumo Total MWh" com o valor calculado (soma de `consumo_anual` de todos os CPEs da proposta / 1000), formatado com casas decimais e unidade "MWh". O valor monetario (margem total) pode manter-se como informacao secundaria.
- No **documento de impressao** (HTML dentro do mesmo ficheiro): a mesma logica -- "Consumo Total MWh" em vez de "Valor Total" para telecom.

**2. Remover badge "Renovacao" dos quadros de CPE**

- `ProposalCpeSelector.tsx` (linha 189-191): remover o badge "Renovacao" fixo.
- `ProposalDetailsModal.tsx` (linha 598-600): remover o badge condicional "Renovacao"/"Novo".

### Secao tecnica

#### Ficheiros a alterar

| Ficheiro | Alteracao |
|---|---|
| `src/components/proposals/ProposalDetailsModal.tsx` | Condicao telecom no bloco "Valor Total" (modal + HTML de impressao); remover badge Renovacao/Novo dos CPEs |
| `src/components/proposals/ProposalCpeSelector.tsx` | Remover badge "Renovacao" fixo (linhas 189-191) |

#### Logica do calculo "Consumo Total MWh"

```typescript
const consumoTotalMwh = proposalCpes.reduce(
  (sum, cpe) => sum + (Number(cpe.consumo_anual) || 0), 0
) / 1000;
```

#### Condicao no modal (pseudo-codigo)

```
Se nicho === 'telecom':
  Label: "Consumo Total MWh"
  Valor: consumoTotalMwh formatado (ex: "12,5 MWh")
Senao:
  Label: "Valor Total"
  Valor: formatCurrency(...)
```

A mesma logica aplica-se ao template HTML de impressao.
