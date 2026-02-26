

## Plano: Reestruturar tabela EE & Gás conforme print

### Alterações

**Ficheiro:** `src/components/settings/CommissionMatrixTab.tsx`

1. **Atualizar `DEFAULT_ENERGY_BANDS`** — incluir todas as 8 bandas com valores exatos do print:
   - `< 0€`: ponderador 0%, valor 0€
   - `> 0€`: ponderador 4%, valor 0€
   - `> 500€`: ponderador 4%, valor 20€
   - `> 1000€`: ponderador 4%, valor 40€
   - `> 2000€`: ponderador 3.76%, valor 80€
   - `> 5000€`: ponderador 1.52%, valor 193€
   - `> 10.000€`: ponderador 1.28%, valor 269€
   - `> 20.000€`: ponderador 0.80%, valor 397€

2. **Reestruturar layout da tabela** — passar de colunas flat para 3 grupos com headers agrupados:

```text
┌──────────────┬────────────────────┬────────────────────┬────────────────────┐
│  Banda de    │     300 MWh        │   301-600 MWh      │     601 MWh        │
│  Margem      ├──────────┬─────────┼──────────┬─────────┼──────────┬─────────┤
│              │ Ponder.  │ Valor   │ Ponder.  │ Valor   │ Ponder.  │ Valor   │
├──────────────┼──────────┼─────────┼──────────┼─────────┼──────────┼─────────┤
│ < 0 €        │  0,00%   │   0€    │  0,00%   │   0€    │  0,00%   │   0€    │
│ > 0 €        │  3,00%   │   0€    │  4,00%   │   0€    │  6,00%   │   0€    │
│ ...          │  ...     │   ...   │  ...     │   ...   │  ...     │   ...   │
└──────────────┴──────────┴─────────┴──────────┴─────────┴──────────┴─────────┘
```

   - Coluna **Banda de Margem**: mostra `< 0 €` para marginMin negativo, `> X €` para os restantes (read-only display)
   - Colunas **301-600 MWh**: editáveis (Ponderador + Valor) — são a referência
   - Colunas **300 MWh** e **601 MWh**: read-only, derivadas automaticamente (÷1.33 e ×1.5)
   - Coluna de ação (remover) no final

3. **Header agrupado** — usar `colSpan={2}` para os títulos "300 MWh", "301-600 MWh", "601 MWh" numa row acima das sub-colunas "Ponderador" e "Valor"

4. **Formatação dos valores derivados** — mostrar com `%` e `€` para ficar consistente com o print

Nenhum outro ficheiro afetado. A lógica de cálculo no hook permanece igual.

