

## Adicionar seleção de comerciais na distribuição de Prospects

### Situação actual
O dialog de distribuição mostra os comerciais elegíveis como badges estáticos. O backend (`distribute_prospects_round_robin`) já aceita `p_salesperson_ids` — se `null`, distribui por todos; se preenchido, distribui apenas pelos selecionados. Mas a UI não permite escolher.

### Solução
Adicionar dois modos de distribuição no dialog + checkboxes para selecionar comerciais específicos.

### Alterações

**Ficheiro: `src/components/prospects/DistributeProspectsDialog.tsx`**

1. **Modo de distribuição** — RadioGroup com duas opções:
   - "Todos os comerciais (round-robin)" — comportamento actual, envia `salespersonIds: undefined`
   - "Comerciais selecionados" — mostra checkboxes para escolher quais

2. **Lista de comerciais com checkboxes** — visível apenas no modo "selecionados":
   - Cada comercial como checkbox com nome
   - Estado `selectedSalespersonIds: string[]`
   - Botões "Selecionar todos" / "Limpar" para conveniência

3. **Validação** — no modo "selecionados", exigir pelo menos 1 comercial selecionado (desabilitar botão "Distribuir" caso contrário)

4. **Passar `salespersonIds`** ao `mutateAsync`:
   - Modo "todos": `salespersonIds: undefined`
   - Modo "selecionados": `salespersonIds: selectedSalespersonIds`

### Ficheiros alterados
| Ficheiro | Acção |
|----------|-------|
| `src/components/prospects/DistributeProspectsDialog.tsx` | Adicionar RadioGroup + checkboxes de comerciais |

Nenhuma alteração de backend necessária — o RPC já suporta o parâmetro `p_salesperson_ids`.

