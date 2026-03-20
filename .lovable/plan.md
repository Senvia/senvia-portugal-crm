

## Alterar fluxo Lead → Won APENAS para Perfect2Gether

### Comportamento atual (todas as orgs)
Quando um lead é movido para "Ganho":
1. Se já é cliente → abre modal "Criar Venda"
2. Se não é cliente → cria cliente automaticamente → abre modal "Criar Venda"

### Novo comportamento (APENAS Perfect2Gether)
1. Se **não é cliente** → cria cliente → navega para a página de Clientes com o drawer da ficha do cliente aberto (em vez de abrir venda)
2. Se **já é cliente** → abre modal "Criar Proposta" (em vez de criar venda)

O lead é marcado como "won" em ambos os casos.

### Alterações técnicas

**Ficheiro: `src/pages/Leads.tsx`**

1. Importar `isPerfect2GetherOrg` de `@/lib/perfect2gether`
2. Adicionar state para abrir `CreateProposalModal` com cliente pré-selecionado: `prefillProposalClientId`
3. No bloco `isWonStage` (linhas ~296-347), adicionar condição para Perfect2Gether:

   **Se já é cliente:**
   - Em vez de abrir `CreateSaleModal`, abrir `CreateProposalModal` com `preselectedClientId`
   - Marcar lead como won imediatamente

   **Se não é cliente:**
   - Criar cliente (como já faz)
   - No `onSuccess`, em vez de abrir sale modal, navegar para `/clients` com state `{ openClientId: newClient.id }`
   - Marcar lead como won imediatamente

4. Adicionar `CreateProposalModal` no JSX (já está importado) com os novos states

**Ficheiro: `src/pages/Clients.tsx`** (pequena alteração)

5. Ler `location.state?.openClientId` para auto-abrir o drawer do cliente recém-criado quando navegado a partir do fluxo de leads

### Resultado
- Perfect2Gether: Lead won → cliente criado → fica na ficha do cliente OU se já existe → cria proposta
- Todas as outras orgs: comportamento atual mantido (Lead won → cria venda)

