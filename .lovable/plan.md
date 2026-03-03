

## Corrigir impressão de card único gerar 5 páginas

### Problema
Quando imprimes apenas o painel de Compromissos (botão de impressora no card), saem 5 páginas — 4 em branco. Isto acontece porque as regras CSS de impressão que adicionámos forçam **todos** os containers a expandir (`overflow: visible`, `height: auto`, `max-height: none`), mesmo no modo single-card. O `body` e todos os containers pai ficam com altura enorme, gerando páginas vazias.

### Causa raiz
A regra global `* { overflow: visible !important; max-height: none !important; }` e `html, body { height: auto !important; }` expandem toda a página mesmo quando só queremos imprimir um card. O `.print-single-active` usa `visibility: hidden` para esconder tudo, mas os elementos escondidos continuam a ocupar espaço no layout.

### Solução
No modo `.print-single-active`, colapsar a altura de todos os elementos escondidos para que não ocupem espaço:

**`src/index.css`** — Atualizar a secção 10 (single-card print):

```css
.print-single-active * {
  visibility: hidden !important;
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  overflow: hidden !important;
}

.print-single-active .print-target,
.print-single-active .print-target * {
  visibility: visible !important;
  height: auto !important;
  min-height: unset !important;
  padding: revert !important;
  margin: revert !important;
  overflow: visible !important;
}

.print-single-active .print-target {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  padding: 1rem !important;
  background: white !important;
  color: black !important;
}
```

Isto garante que no modo single-card, apenas o card alvo ocupa espaço — tudo o resto colapsa a zero, resultando numa única página de impressão.

