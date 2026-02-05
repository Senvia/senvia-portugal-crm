
## Remover Secao de Recorrencia Mensal Duplicada

### Problema

Agora que cada produto mensal tem a sua propria data de vencimento inline (na linha do produto), a seccao global "Recorrencia Mensal" ja nao faz sentido e esta duplicada.

---

### Alteracoes

**Ficheiro:** `src/components/sales/EditSaleModal.tsx`

| Remover | Linhas | Descricao |
|---------|--------|-----------|
| Estados | 91-95 | `hasRecurring`, `recurringValue`, `nextRenewalDate`, `recurringStatus` |
| useEffect auto-detect | 134-163 | Logica que ativava o toggle automaticamente |
| Inicializacao | 104-108 | Campos de recorrencia no useEffect principal |
| Submit data | 280-284 | Campos de recorrencia no updateSale |
| Seccao UI | 588-667 | Toda a seccao "Recorrencia Mensal" com switch, inputs e select |
| Import | 42 | `RecurringStatus` type |

---

### Resultado Final

- Cada produto mensal tem a sua data de vencimento individual na linha
- Sem seccao global de recorrencia
- Modal mais limpo e simples

**Total: 1 ficheiro modificado (remover ~90 linhas)**
