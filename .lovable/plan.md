

## Diagnóstico

O `ProposalDetailsModal` (que é um `Dialog`) está renderizado **dentro** do `DialogContent` do drawer de clientes (linha 549-553). Isto cria um **Dialog aninhado dentro de outro Dialog**, o que causa o ecrã branco — o Radix UI perde o contexto e bloqueia a interação.

O mesmo problema não afeta o `AddCommunicationModal` porque provavelmente usa `Sheet` ou outro componente, mas o `ProposalDetailsModal` usa `Dialog`.

## Correção

**Ficheiro: `src/components/clients/ClientDetailsDrawer.tsx`**

Mover o `ProposalDetailsModal` para **fora** do componente `<Dialog>` principal (após o `</Dialog>` de fecho, antes do return final):

```tsx
// Antes (linha 544-555):
    </DialogContent>
  </Dialog>

// Depois:
    </DialogContent>
  </Dialog>

  {/* Proposal Details Modal - fora do Dialog principal */}
  <ProposalDetailsModal
    proposal={selectedProposal}
    open={!!selectedProposal}
    onOpenChange={(open) => { if (!open) setSelectedProposal(null); }}
  />
```

Remover o bloco do `ProposalDetailsModal` de dentro do `DialogContent` (linhas 548-553) e colocá-lo após o `</Dialog>` de fecho. Envolver o return num fragment `<>...</>`.

1 ficheiro, ~10 linhas movidas.

