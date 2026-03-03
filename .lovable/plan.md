

## Problema: Template HTML com variáveis Brevo malformadas

O erro do Brevo está no template **"Inicio Contratual"**. O editor rich-text (TipTap) formatou a variável `{{Email}}` com bold parcial, quebrando a sintaxe que o Brevo espera:

```
Actual:    <strong>{{</strong>Email<strong>}}</strong>
Expected:  {{Email}}
```

O Brevo vê `{{` mas não encontra `}}` no mesmo nível de texto — as tags `<strong>` interrompem o parsing de variáveis.

### Solução

**1. Corrigir o HTML do template na base de dados**

Executar um UPDATE para limpar o HTML, garantindo que todas as variáveis `{{ }}` não estejam partidas por tags HTML:

- `<strong>{{</strong>Email<strong>}}</strong>` → `{{Email}}`
- Verificar se `{{Fidelização}}` e outras variáveis estão intactas

**2. Sanitizar variáveis antes de enviar ao Brevo (edge function)**

Na edge function `send-template-email`, adicionar uma sanitização do `html_content` antes de enviar — remover tags HTML de dentro de variáveis `{{ }}`:

```js
// Remove HTML tags inside {{ }} 
html = html.replace(/\{\{[^}]*\}\}/g, (match) => {
  return match.replace(/<[^>]*>/g, '');
});
```

Isto previne o problema para templates futuros que o editor possa corromper.

### Ficheiros a editar
- **Database**: UPDATE no template `d7b41aeb...` para corrigir o HTML
- **`supabase/functions/send-template-email/index.ts`**: Adicionar sanitização de variáveis no HTML antes do envio

