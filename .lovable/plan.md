

## Formulario embebido directamente no site do cliente (iframe embed)

### Funciona? Sim — com o embed script a fazer a ponte

O formulario pode aparecer directamente no site do cliente via `<iframe>`. O problema e que o iframe corre no dominio `app.senvia.pt` e nao tem acesso a URL do site pai (`consultoriogomes.pt?fbclid=abc123`) por restricoes de seguranca do browser (cross-origin).

A solucao: o **embed script** (que corre no dominio do cliente) le os parametros da URL do cliente e injeta-os no `src` do iframe automaticamente.

### Fluxo

```text
1. consultoriogomes.pt?fbclid=abc123  (utilizador chega do anuncio)
2. embed.js le fbclid da URL do pai
3. Cria iframe: src="app.senvia.pt/c/consultoriogomes?fbclid=abc123"
4. Formulario dentro do iframe captura fbclid via source-detection.ts
5. submit-lead envia CAPI com fbc → Facebook atribui o lead ao anuncio
```

### Implementacao (3 ficheiros)

**1. `public/embed.js`** — Script embed (~3KB)

Suporta dois modos via `data-mode`:
- `data-mode="iframe"` — Renderiza o formulario inline dentro de um `<div>` no site do cliente (o que queres agora)
- `data-mode="redirect"` — Botao flutuante que redireciona (o cenario anterior)

O script:
- Captura `fbclid`, `gclid`, `ttclid`, UTMs da URL actual do site do cliente
- No modo iframe: cria um `<iframe>` com esses params no src, com altura auto-ajustavel
- No modo redirect: cria botao que redireciona com params

Codigo do cliente (1 linha):
```html
<div id="senvia-form"></div>
<script src="https://app.senvia.pt/embed.js" data-form="consultoriogomes" data-mode="iframe"></script>
```

**2. `supabase/functions/submit-lead/index.ts`** — Fix CAPI (prioritario)

Extrair `fbclid` do `custom_data` e construir `fbc` para o Meta atribuir:

```typescript
const fbclid = (body.custom_data as Record<string, unknown>)?.fbclid as string | undefined;
const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : undefined;

// user_data no CAPI:
fbc: fbc,
```

**3. `src/components/settings/FormsManager.tsx`** — Opcao "Copiar Codigo Embed"

No dropdown de cada formulario, adicionar duas novas opcoes:
- **"Copiar Embed (Formulario)"** — copia o `<script>` com `data-mode="iframe"`
- **"Copiar Embed (Botao)"** — copia o `<script>` com `data-mode="redirect"`

Com toast de confirmacao "Codigo copiado!"

### Detalhe do iframe

O `embed.js` no modo iframe:
- Cria iframe com `border:none`, `width:100%`, altura inicial 600px
- Escuta `postMessage` do formulario Senvia para auto-ajustar altura (evitar scrollbar duplo)
- No formulario (`ConversationalLeadForm.tsx` / `PublicLeadForm.tsx`), adicionar `window.parent.postMessage({ type: 'senvia-resize', height: document.body.scrollHeight }, '*')` apos render

### Resultado

O cliente cola 2 linhas de HTML no site dele. O formulario aparece directamente na pagina. O tracking funciona automaticamente — sem o cliente precisar de saber o que e fbclid ou CAPI.

