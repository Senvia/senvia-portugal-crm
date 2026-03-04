

## Diagnóstico: Meta Pixel não dispara

O aviso "Pixel installed but hasn't fired recently" indica que o script do Meta Pixel carrega mas o pedido de rede para `facebook.com/tr` não é executado. Há dois problemas na implementação atual:

### Problema 1: Posição do script no `index.html`

O script do pixel está **depois** do `<script type="module" src="/src/main.tsx">`, que é um módulo async. Isto não é um problema grave, mas o Meta recomenda que o pixel esteja no `<head>` para garantir que dispara antes de qualquer interação do utilizador.

### Problema 2: Content Security Policy / Preview domain

No ambiente de preview do Lovable (`*.lovable.app`), o Facebook pode não processar o pixel corretamente porque o domínio não corresponde ao configurado no Meta Business. Isto é **esperado** no preview. O pixel deve funcionar no domínio de produção (`senvia.pt`).

### Problema 3: Bloqueio por ad-blockers

Se estás a usar um ad-blocker ou o Meta Pixel Helper num browser com proteção de tracking (ex: Brave, Firefox com ETP), o pedido será bloqueado.

## Solução

Mover o script do Meta Pixel do final do `<body>` para dentro do `<head>`, que é a posição recomendada pela Meta. Isto garante que o `PageView` dispara o mais cedo possível.

### Alteração

| Ficheiro | Ação |
|---|---|
| `index.html` | Mover o bloco do Meta Pixel (script + noscript) do final do `<body>` para dentro do `<head>`, logo antes do `</head>` |

O `<noscript>` fallback fica logo após `<body>` (já está correto).

O script principal do pixel move para o `<head>`:

```html
<head>
  ...existing meta tags...
  
  <!-- Meta Pixel Code -->
  <script>
  !function(f,b,e,v,n,t,s){...}
  fbq('init', '2027821837745963');
  fbq('track', 'PageView');
  </script>
</head>
```

**Nota importante**: Para validar que funciona, é necessário testar no domínio de produção (`senvia.pt`) ou no domínio publicado (`senvia-portugal-crm.lovable.app`), não no preview do Lovable.

