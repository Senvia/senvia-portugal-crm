

## Problema: Editor de Email HTML

### Diagnóstico

O `TemplateEditor` usa **TipTap** (editor rich-text) que só suporta elementos básicos (p, h1, h2, bold, italic, links, listas). Quando colas HTML complexo (tabelas, divs, estilos inline, imagens), o TipTap **elimina tudo o que não reconhece**, destruindo o layout.

Além disso, ao alternar entre a tab "HTML" e "Editor Visual", o TipTap re-parseia o HTML e remove os elementos não suportados — perdendo o conteúdo colado.

### Correção

**Ficheiro:** `src/components/marketing/TemplateEditor.tsx`

1. **Separar os modos**: O editor visual (TipTap) serve para emails simples. O modo HTML serve para HTML complexo. Quando o utilizador escreve/cola no modo HTML, o conteúdo **não deve passar pelo TipTap** — vai direto para o `onChange` e para o preview.

2. **Desativar sync destrutivo**: Remover o `useEffect` que faz `editor.commands.setContent(value)` sempre que o `value` muda (linha 207-211). Este efeito causa o TipTap a re-parsear e destruir HTML quando se alterna de tab.

3. **Sync inteligente por tab**: Só sincronizar o TipTap quando o utilizador entra na tab "editor" e o conteúdo mudou, com aviso de que HTML complexo pode ser simplificado. Quando na tab "html", o textarea funciona sem interferência do TipTap.

4. **Melhorar a textarea HTML**: Aumentar a área, manter `font-mono`, e garantir que paste funciona sem limitações.

### Mudanças concretas

- Remover o `useEffect` de sync bidirecional (linhas 207-211)
- Adicionar lógica no `onValueChange` das tabs: quando muda para "editor", fazer `setContent` com o HTML atual; quando muda para "html", atualizar o textarea com `editor.getHTML()`
- Adicionar aviso visual na tab "Editor Visual" quando o conteúdo tem HTML que o TipTap não suporta (tabelas, divs, etc.)
- Manter o preview iframe sempre atualizado independentemente do modo ativo

