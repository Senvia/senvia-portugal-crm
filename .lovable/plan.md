

## Correção: Widget "Fidelizações a Expirar" Apenas para Telecom

### Problema Identificado

No ficheiro `src/pages/Dashboard.tsx` (linha 83), o widget `FidelizationAlertsWidget` está a ser exibido com base apenas na condição:

```typescript
{clientsModuleEnabled && (
  <FidelizationAlertsWidget />
)}
```

Isto faz com que apareça em **todos os templates** que tenham o módulo de clientes ativo, quando deveria aparecer **apenas para organizações "telecom"**.

---

### Solução

Adicionar a verificação do niche à condição de renderização:

```typescript
const isTelecom = organization?.niche === 'telecom';

// Render condicional
{isTelecom && clientsModuleEnabled && (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <FidelizationAlertsWidget />
  </div>
)}
```

---

### Ficheiro a Modificar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Dashboard.tsx` | Adicionar verificação `organization?.niche === 'telecom'` à condição do widget |

---

### Alteração Específica

**Linha 83 - Antes:**
```typescript
{clientsModuleEnabled && (
```

**Depois:**
```typescript
{organization?.niche === 'telecom' && clientsModuleEnabled && (
```

---

### Resultado

| Nicho | Widget Fidelizações |
|-------|---------------------|
| `telecom` | Visível (se módulo clientes ativo) |
| `generic` | Oculto |
| `clinic` | Oculto |
| `construction` | Oculto |
| `real_estate` | Oculto |
| `ecommerce` | Oculto |

