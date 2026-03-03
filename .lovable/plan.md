

## Porque aparece o URL no rodapé da impressão

O URL que aparece no rodapé (`https://lovable.dev/projects/...`) é colocado **pelo browser**, não pelo código do projeto. É um comportamento padrão — o browser imprime automaticamente o URL da página no rodapé e o título no cabeçalho.

**Isto NÃO pode ser removido via código (CSS ou JavaScript).** A propriedade `@page` do CSS não controla os headers/footers do browser.

### Soluções

1. **Solução imediata (manual):** Nas opções de impressão do browser, desmarcar **"Headers and footers"** (ou "Cabeçalhos e rodapés"). Isto remove tanto o URL como a data/título do cabeçalho.

2. **Solução definitiva:** Configurar o domínio personalizado `app.senvia.pt` em **Settings → Domains**. Assim, mesmo que o browser imprima o URL, mostrará `https://app.senvia.pt/dashboard` em vez do URL técnico do projeto.

Não há alterações de código a fazer — isto é uma limitação do browser, não do projeto.

