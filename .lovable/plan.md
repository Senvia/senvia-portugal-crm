

## Problema identificado

O módulo de Comissões **existe no código** e está condicionado a `isTelecom`. Há dois problemas:

1. **Estado persistido desatualizado**: O `activeTab` usa `usePersistedState('finance-tab-v1', ...)`. Se a página foi carregada antes com outro nicho ou antes da organização carregar, o valor persistido pode ser `'resumo'` — que está **escondido** para telecom. O tab fica num estado inválido.

2. **Valor default calculado apenas uma vez**: `isTelecom` pode ser `undefined` no primeiro render (antes da org carregar), fazendo o default ser `'resumo'`.

---

## Plano de correção

### Ficheiro: `src/pages/Finance.tsx`

1. **Adicionar efeito para corrigir tab inválida**: Quando `isTelecom` muda (org carrega), verificar se `activeTab` é um valor válido para o nicho atual. Se não for, forçar para o primeiro tab válido (`'outros'` para telecom, `'resumo'` para outros).

2. **Lógica concreta**:
```typescript
const validTabs = isTelecom ? ['outros', 'comissoes'] : ['resumo', 'contas', 'faturas', 'outros'];

useEffect(() => {
  if (organization && !validTabs.includes(activeTab)) {
    setActiveTab(validTabs[0]);
  }
}, [organization?.niche]);
```

Apenas 1 ficheiro editado, ~5 linhas adicionadas.

