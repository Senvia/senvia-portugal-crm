
# Corrigir Validacao de Propostas (Todos os Tipos)

## Problema
A validacao atual (`isFormValid`) so verifica propostas do tipo "servicos" em telecom. Para o tipo "energia" (o default), retorna sempre `true`, permitindo criar propostas completamente vazias (como a "0020").

## Solucao

Adicionar validacao para **todos os cenarios** no `CreateProposalModal.tsx`:

### Telecom - Energia
- Pelo menos 1 CPE adicionado (`proposalCpes.length > 0`)
- Valor total da proposta maior que 0 (margem dos CPEs)

### Telecom - Servicos (ja existe, manter)
- Pelo menos 1 produto selecionado
- kWp total > 0
- Comissao > 0

### Non-Telecom (generico)
- Pelo menos 1 produto selecionado OU valor total > 0

### Comum a todos
- Cliente selecionado (obrigatorio em todos os cenarios)

## Alteracoes no codigo

**Ficheiro:** `src/components/proposals/CreateProposalModal.tsx`

1. Substituir a logica de validacao atual:

```typescript
const isEnergiaValid = useMemo(() => {
  if (!isTelecom || proposalType !== 'energia') return true;
  return proposalCpes.length > 0;
}, [isTelecom, proposalType, proposalCpes]);

const isGenericValid = useMemo(() => {
  if (isTelecom) return true;
  return selectedProducts.length > 0;
}, [isTelecom, selectedProducts]);

const isFormValid = isServicosValid && isEnergiaValid && isGenericValid && !!selectedClientId;
```

2. Adicionar mensagens de erro inline para:
   - Cliente nao selecionado: "Selecione um cliente"
   - Energia sem CPEs: "Adicione pelo menos 1 CPE/CUI"
   - Generico sem produtos: "Adicione pelo menos 1 produto"

3. O botao "Criar Proposta" fica desabilitado apos tentativa com dados em falta (logica `attempted` ja existente)

## Ficheiros alterados
- `src/components/proposals/CreateProposalModal.tsx`
