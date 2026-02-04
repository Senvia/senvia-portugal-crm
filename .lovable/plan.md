

## Correção: Tab de CPEs Apenas para Nicho Telecom

### Problema Identificado

No ficheiro `ClientDetailsDrawer.tsx`:

- **Linha 67-69**: Existe a verificação `isTelecom` mas apenas para adaptar labels
- **Linhas 215-218**: O tab "CPEs" é **sempre renderizado** independentemente do nicho
- **Linhas 377-380**: O conteúdo do tab "CPEs" também é **sempre renderizado**

Isto faz com que organizações de outros templates (generic, clinic, construction, etc.) vejam o tab de CPEs, quando deveria ser uma funcionalidade exclusiva do nicho **telecom**.

---

### Solução

Adicionar renderização condicional baseada em `isTelecom` para:

1. O `TabsTrigger` de CPEs (ocultar o tab na lista)
2. O `TabsContent` de CPEs (ocultar o conteúdo)

---

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/clients/ClientDetailsDrawer.tsx` | Condicionar tab e conteúdo de CPEs a `isTelecom` |

---

### Alterações Específicas

**Linhas 215-218 (TabsTrigger):**

Antes:
```tsx
<TabsTrigger value="cpes" className="text-xs">
  <CpeIcon className="h-3 w-3 mr-1" />
  {cpeTabLabel} ({cpes.length})
</TabsTrigger>
```

Depois:
```tsx
{isTelecom && (
  <TabsTrigger value="cpes" className="text-xs">
    <CpeIcon className="h-3 w-3 mr-1" />
    {cpeTabLabel} ({cpes.length})
  </TabsTrigger>
)}
```

---

**Linhas 377-380 (TabsContent):**

Antes:
```tsx
<TabsContent value="cpes" className="p-6 pt-4 mt-0">
  <CpeList clientId={client.id} />
</TabsContent>
```

Depois:
```tsx
{isTelecom && (
  <TabsContent value="cpes" className="p-6 pt-4 mt-0">
    <CpeList clientId={client.id} />
  </TabsContent>
)}
```

---

### Resultado Esperado

| Nicho | Tab CPEs/CUI Visível |
|-------|---------------------|
| `telecom` | Sim |
| `generic` | Não |
| `clinic` | Não |
| `construction` | Não |
| `real_estate` | Não |
| `ecommerce` | Não |

---

### Considerações Adicionais

O hook `useCpes(client?.id)` na linha 63 continuará a ser chamado mesmo em nichos não-telecom. Para otimização futura, pode-se também condicionar esta chamada:

```tsx
const { data: cpes = [] } = useCpes(isTelecom ? client?.id : null);
```

Isto evita queries desnecessárias à base de dados para organizações que não usam CPEs.

