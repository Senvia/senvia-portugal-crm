

## Correcao do Scroll no Modal de Editar Venda

### Problema Identificado

A estrutura atual e:
```text
DialogContent (h-[90vh] flex flex-col)
└── DialogHeader
└── form  ← NAO TEM flex flex-col, quebra o layout
    └── ScrollArea (flex-1 min-h-0)  ← NAO FUNCIONA pois o pai nao e flex
    └── Botoes
```

O `<form>` nao tem `flex flex-col` nem `flex-1`, entao o `ScrollArea` nao consegue calcular a altura corretamente.

---

### Solucao

Mover a estrutura flex para o form:

```text
DialogContent (h-[90vh] flex flex-col overflow-hidden)
└── DialogHeader
└── form (flex-1 flex flex-col min-h-0)  ← ADICIONAR
    └── ScrollArea (flex-1 min-h-0)  ← AGORA FUNCIONA
    └── Botoes (shrink-0)
```

---

### Alteracoes

| Linha | Antes | Depois |
|-------|-------|--------|
| 374 | `<form onSubmit={handleSubmit}>` | `<form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">` |

---

### Implementacao

**Ficheiro:** `src/components/sales/EditSaleModal.tsx`

**Linha 374 - Adicionar classes ao form:**
```tsx
<form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
```

Isto faz com que:
1. O form ocupe o espaco disponivel (`flex-1`)
2. O form seja um container flex vertical (`flex flex-col`)
3. O form possa encolher abaixo do seu conteudo (`min-h-0`)
4. O overflow seja controlado (`overflow-hidden`)

O `ScrollArea` ja tem `flex-1 min-h-0`, entao vai funcionar corretamente quando o pai (form) for um flex container.

---

**Total: 1 linha modificada**

