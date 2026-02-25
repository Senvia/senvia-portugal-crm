

## Proposta 19 sem dados ao editar — Problema de migração de dados

### Causa raiz

A proposta 19 foi criada **antes** da implementacao do sistema `servicos_details` por produto. Os dados estao guardados nos campos de nivel superior da proposta:

```text
proposal.kwp = 120
proposal.comissao = 3450
proposal.servicos_produtos = ["Solar"]
proposal.servicos_details = null        ← VAZIO
```

Quando o `EditProposalModal` abre, faz:
```
servicosDetails = proposal.servicos_details || {}  →  {}
```

O checkbox "Solar" fica activo (porque `servicos_produtos` tem "Solar"), mas os campos de detalhe (`valor`, `kwp`, `comissao`) ficam vazios porque `servicosDetails["Solar"]` e `undefined`.

### Solucao

Adicionar logica de migracaoo no `useEffect` do `EditProposalModal` — quando `servicos_details` esta vazio mas existem `servicos_produtos` com dados de nivel superior (`kwp`, `comissao`), preencher automaticamente o primeiro produto com esses valores.

### Alteracao

**`src/components/proposals/EditProposalModal.tsx`** — No `useEffect` (linhas 86-114):

Depois de definir `servicosDetails` a partir de `proposal.servicos_details`, verificar se esta vazio mas existem produtos seleccionados com dados legacy:

```typescript
// Migrar dados legacy: se servicos_details é null mas tem kwp/comissao no nível superior
const details = (proposal as any).servicos_details || {};
if (
  Object.keys(details).length === 0 &&
  proposal.servicos_produtos?.length === 1 &&
  (proposal.kwp || proposal.comissao)
) {
  const prodName = proposal.servicos_produtos[0];
  details[prodName] = {
    kwp: proposal.kwp || undefined,
    comissao: proposal.comissao || undefined,
  };
}
setServicosDetails(details);
```

Isto preenche automaticamente os campos do produto "Solar" com `kwp: 120` e `comissao: 3450` quando se abre a proposta 19 para editar.

### Ficheiro a alterar

| Ficheiro | O que muda |
|---|---|
| `src/components/proposals/EditProposalModal.tsx` | Migracao automatica de dados legacy no useEffect de inicializacao |

