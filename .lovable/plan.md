

## Alterar Texto "Renovar Existente" para "Selecionar Existente"

### Alteracao

| Ficheiro | Linha | Alteracao |
|----------|-------|-----------|
| `src/components/proposals/ProposalCpeSelector.tsx` | 430 | Mudar "Renovar Existente" para "Selecionar Existente" |

### Detalhe

```typescript
// Antes
<TabsTrigger value="existing" className="flex items-center gap-2" disabled={!clientId}>
  <RefreshCw className="h-3 w-3" />
  Renovar Existente
</TabsTrigger>

// Depois
<TabsTrigger value="existing" className="flex items-center gap-2" disabled={!clientId}>
  <RefreshCw className="h-3 w-3" />
  Selecionar Existente
</TabsTrigger>
```

**Total: 1 ficheiro modificado**

