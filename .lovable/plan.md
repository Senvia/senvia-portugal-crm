

## Bug: Campos de energia resetam ao editar

**Causa raiz:** No `EditProposalModal.tsx`, o `useEffect` (linha 132-172) que inicializa os CPEs tem `calculateEnergyCommission` na lista de dependências. Como essa função é recriada a cada render, o efeito dispara continuamente, sobrescrevendo o estado editado pelo utilizador com os dados originais da base de dados.

**Correção:**

### Ficheiro: `src/components/proposals/EditProposalModal.tsx`

1. Remover `hasEnergyConfig` e `calculateEnergyCommission` das dependências do `useEffect` (linha 172)
2. Usar um `useRef` para guardar referência estável a `calculateEnergyCommission`, evitando que o efeito re-execute quando a função muda
3. Dependências finais: `[open, existingCpes]` apenas — o efeito só deve correr quando o modal abre ou quando os dados da DB mudam

```typescript
// Ref estável para a função de cálculo
const calcRef = useRef(calculateEnergyCommission);
calcRef.current = calculateEnergyCommission;

useEffect(() => {
  if (open && existingCpes.length > 0) {
    setProposalCpes(
      existingCpes.map(cpe => {
        // ... usar calcRef.current em vez de calculateEnergyCommission
      })
    );
  } else if (open) {
    setProposalCpes([]);
  }
}, [open, existingCpes]);
```

Nenhuma outra alteração necessária. O `CreateProposalModal` não tem este bug.

