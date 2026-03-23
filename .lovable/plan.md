

## Esconder emails placeholder na UI de Leads

### Problema
Quando um prospect sem email é distribuído, o SQL gera `prospect-UUID@placeholder.local` porque a tabela `leads` exige email não-nulo. A UI mostra esse email falso ao utilizador.

### Solução
Criar um helper que detecta emails `@placeholder.local` e os trata como "sem email" em toda a UI.

### Alterações

**1) `src/lib/leadUtils.ts`** (novo helper)
- Função `isPlaceholderEmail(email: string | null): boolean` — retorna `true` se contém `@placeholder.local`
- Função `displayEmail(email: string | null): string` — retorna `""` ou `"Sem email"` se placeholder, caso contrário retorna o email real

**2) `src/components/leads/LeadsTableView.tsx`**
- Na coluna de email, usar `isPlaceholderEmail` para mostrar "—" ou texto vazio em vez do placeholder

**3) `src/components/leads/LeadDetailsModal.tsx`**
- No campo de email editável, mostrar vazio se placeholder
- No botão "Enviar Email", desabilitar se placeholder
- Ao guardar um email novo por cima do placeholder, funciona normalmente

**4) `src/components/leads/LeadCard.tsx`**
- Desabilitar botão de email se placeholder

**5) `src/components/leads/SendLeadEmailModal.tsx`**
- Validar que email não é placeholder antes de enviar

### Ficheiros alterados
| Ficheiro | Acção |
|----------|-------|
| `src/lib/leadUtils.ts` | Novo — helper `isPlaceholderEmail` |
| `src/components/leads/LeadsTableView.tsx` | Esconder placeholder |
| `src/components/leads/LeadDetailsModal.tsx` | Esconder placeholder, permitir editar |
| `src/components/leads/LeadCard.tsx` | Desabilitar email se placeholder |
| `src/components/leads/SendLeadEmailModal.tsx` | Validar email real |

