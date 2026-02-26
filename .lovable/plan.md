

## Corrigir Layout do Modal "Solar, Baterias..." na Matriz de Comissões

### Problema

O modal `ProductModal` no `CommissionMatrixTab.tsx` usa `variant="fullScreen"` mas falta-lhe o padrão `p-0 gap-0` que todos os outros modais fullScreen do projecto utilizam. Isto causa:
- Padding inconsistente (o DialogContent default adiciona padding que conflita com o padding interno)
- Aparência de "sem padding" porque os espaçamentos não estão correctos

### Solução

Alinhar o `ProductModal` com o padrão dos outros modais fullScreen do projecto (ex: `CreateSaleModal`, `LeadDetailsModal`, etc.): adicionar `p-0 gap-0` ao `DialogContent` e ajustar o padding interno das secções.

### Alterações — `src/components/settings/CommissionMatrixTab.tsx`

**Linha 184** — Adicionar `p-0 gap-0` ao `DialogContent`:
```tsx
// Antes
<DialogContent variant="fullScreen" className="flex flex-col overflow-hidden">

// Depois
<DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0 overflow-hidden">
```

**Linha 185** — Corrigir padding do `DialogHeader` para ser consistente com o padrão do projecto (px-6 no desktop, pr-14 para dar espaço ao botão fechar):
```tsx
// Antes
<DialogHeader className="shrink-0 border-b pb-4 px-4 sm:px-6 pt-4">

// Depois
<DialogHeader className="shrink-0 border-b px-4 sm:px-6 py-4 pr-14">
```

**Linha 193** — Manter o padding do corpo do scroll (já está correcto: `px-4 sm:px-6 py-4`).

**Linha 216** — Footer já está correcto: `px-4 sm:px-6 py-3`.

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `src/components/settings/CommissionMatrixTab.tsx` | Corrigir classes do `DialogContent` e `DialogHeader` |

