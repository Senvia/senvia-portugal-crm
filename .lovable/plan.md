

## Corrigir layout da impressão single-card

### Problema
O `padding: revert` e `margin: revert` no `.print-target *` não funcionam bem porque o browser reverte para os estilos padrão do user-agent (não para os do Tailwind). Isto causa:
- Espaçamentos inconsistentes (tabelas sem padding, textos colados)
- O card fica sem bordas e sem a estrutura visual original
- O `body::before` ("Senvia OS") continua visível mesmo no modo single-card, ocupando espaço desnecessário

### Solução
Reescrever a secção 10 em `src/index.css`:

1. **Substituir `revert` por valores concretos** — usar `unset` em vez de `revert` para padding/margin nos filhos do target, permitindo que os estilos do Tailwind se apliquem normalmente
2. **Esconder o header "Senvia OS"** no modo single-card (`body::before { display: none }`)
3. **Restaurar bordas e border-radius** no `.print-target` para manter a aparência do card
4. **Adicionar padding interno adequado** ao card e centralizar na página

```css
/* ===== 10. Single-card print mode ===== */
.print-single-active * {
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  overflow: hidden !important;
}

.print-single-active body::before {
  display: none !important;
}

.print-single-active .print-target,
.print-single-active .print-target * {
  visibility: visible !important;
  height: auto !important;
  min-height: unset !important;
  padding: unset !important;
  margin: unset !important;
  border: unset !important;
  overflow: visible !important;
}

.print-single-active .print-target {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  max-width: 100%;
  padding: 1.5rem !important;
  background: white !important;
  color: black !important;
  border: 1px solid #ddd !important;
  border-radius: 0.75rem !important;
  box-shadow: none !important;
}

/* Ensure table cells have proper spacing */
.print-single-active .print-target th,
.print-single-active .print-target td {
  padding: 0.375rem 0.5rem !important;
  border-bottom: 1px solid #eee !important;
}
```

### Ficheiro a editar
- `src/index.css` — secção 10

