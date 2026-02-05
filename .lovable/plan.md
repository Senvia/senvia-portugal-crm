
## Simplificar Dashboard Financeiro

### Alteracoes

**Ficheiro:** `src/pages/Finance.tsx`

| Acao | Descricao |
|------|-----------|
| Remover import | `RenewalAlertsWidget` (linha 19) |
| Remover secao | "Proximos Recebimentos" (linhas 269-332) |
| Tornar card clicavel | Card "Pendente" abre pagina de pagamentos pendentes |

---

### Detalhes

1. **Remover RenewalAlertsWidget**
   - Remover import da linha 19
   - Remover o componente e a grid de 2 colunas (linhas 269-332)

2. **Card Pendente - Tornar clicavel**
   - Adicionar `cursor-pointer`, `hover:bg-muted/50`, `transition-colors`, `group`
   - Adicionar `onClick={() => navigate('/financeiro/pagamentos?status=pending')}`
   - Adicionar icone `ExternalLink` no hover

3. **Pagina de Pagamentos - Filtrar por status**
   - Ler parametro `status=pending` da URL
   - Aplicar filtro automaticamente ao carregar

---

### Ficheiros Alterados

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/Finance.tsx` | Remover widgets, card clicavel |
| `src/pages/finance/Payments.tsx` | Ler status da URL para pre-filtrar |

**Total: 2 ficheiros modificados**
