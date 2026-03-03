

## Remover "Lovable" das páginas de impressão

### O Problema
Quando imprime o dashboard, o browser mostra o URL (`lovable.app`) no cabeçalho/rodapé da página impressa. Isto é um comportamento padrão do browser — ele imprime o URL da página.

### Solução
Não é possível controlar os headers/footers do browser via CSS (são definidos pelo utilizador nas configurações de impressão). No entanto, podemos:

1. **Adicionar `@page` rules** no CSS para definir margens e tentar remover headers/footers do browser:
```css
@page {
  margin: 1cm;
  size: A4;
}
```

2. **Adicionar um cabeçalho "Senvia OS"** visível apenas na impressão, para que a marca Senvia apareça no topo de cada página impressa, sobrepondo visualmente qualquer referência ao URL.

3. **A solução definitiva** é configurar o domínio personalizado (`app.senvia.pt`) em **Settings → Domains**. Assim, mesmo o URL que o browser coloca no header/footer mostrará `app.senvia.pt` em vez de `lovable.app`.

### Ficheiros a editar
- **`src/index.css`** — adicionar `@page` rules e cabeçalho de impressão com marca Senvia
- **`src/components/dashboard/PrintCardButton.tsx`** — injetar título "Senvia OS" no conteúdo impresso

