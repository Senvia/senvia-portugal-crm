

## Fix: Modal de Objetivos Anuais "bugado"

### Problema

O `useEffect` no `EditActivationObjectivesModal` tem `getTarget` como dependência. Como `getTarget` é uma função normal (closure) criada a cada render no hook `useActivationObjectives`, ganha uma nova referência em cada render. Isto causa:
- O `useEffect` dispara repetidamente, resetando os valores que o utilizador acabou de digitar
- Os inputs ficam "presos" ou voltam a 0

### Solução

1. **`src/hooks/useActivationObjectives.ts`**: Envolver `getTarget` em `useCallback` para estabilizar a referência.

2. **`src/components/dashboard/EditActivationObjectivesModal.tsx`**: Remover `getTarget` das dependências do `useEffect`, usando apenas `open`, `members`, `periodType`, `proposalType` como triggers. Usar uma ref ou chamar `getTarget` apenas quando o modal abre (não a cada re-render).

### Alterações

**`src/hooks/useActivationObjectives.ts`**:
- Importar `useCallback` do React
- Envolver `getTarget` e `countActivations` em `useCallback` com as dependências correctas (`objectives`, `currentMonthStart`, `currentYearStart` para `getTarget`; `monthlyActivations`, `annualActivations` para `countActivations`)

**`src/components/dashboard/EditActivationObjectivesModal.tsx`**:
- Remover `getTarget` da lista de dependências do `useEffect` (deixar apenas `open, members, periodType, proposalType`)
- Isto evita que os valores sejam resetados enquanto o utilizador está a digitar

