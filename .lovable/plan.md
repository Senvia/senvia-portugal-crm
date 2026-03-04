

## Diagnóstico: Evento Lead não atribuído ao anúncio

### O que acontece hoje

```text
senvia.pt/senvia-os (Pixel ativo)
   ↓ clique "Teste Grátis"
senvia-portugal-crm.lovable.app/?tab=signup (domínio diferente)
   ↓ registo
Login.tsx dispara fbq('track', 'Lead') 
   → Pixel sem cookie fbc/fbp → Meta não consegue atribuir ao anúncio
```

- **Cookies `_fbc` e `_fbp`** ficam em `senvia.pt` e não são partilhados com `lovable.app`
- O CAPI server-side só é chamado no `submit-lead` (formulários públicos), **não no registo de conta**
- Resultado: o Meta recebe o evento Lead mas sem dados de atribuição ao clique do anúncio

### Solução proposta

Passar os parâmetros de rastreio (`fbclid`, `fbc`, `fbp`) via URL do link do anúncio → capturá-los no registo → enviá-los ao CAPI server-side.

| Passo | Ficheiro | Ação |
|---|---|---|
| 1 | `src/pages/Login.tsx` | Capturar `fbclid`, `fbc`, `fbp` dos query params da URL ao carregar a página. Guardar em state. |
| 2 | `src/pages/Login.tsx` | Após registo bem-sucedido, além do `fbq('track', 'Lead')` client-side, chamar a edge function `meta-capi-event` com os dados do utilizador + `fbc`/`fbp` do URL |
| 3 | Link do anúncio | Garantir que o link no anúncio passa os params: `https://senvia-portugal-crm.lovable.app/?tab=signup&fbclid={fbclid}` (o Meta faz isso automaticamente) |

### Detalhe técnico - Login.tsx

Após registo:
```typescript
// Extrair fbclid/fbc/fbp dos URL params
const urlParams = new URLSearchParams(window.location.search);
const fbclid = urlParams.get('fbclid');
const fbc = fbclid ? `fb.1.${Date.now()}.${fbclid}` : null;

// Chamar CAPI server-side com dados de atribuição
await supabase.functions.invoke('meta-capi-event', {
  body: {
    pixel_id: '2027821837745963',
    event_name: 'Lead',
    event_id: eventId, // mesmo ID usado no fbq client-side para deduplicação
    user_data: {
      em: email,
      fbc: fbc,
      client_ip_address: '',
      client_user_agent: navigator.userAgent,
    },
    custom_data: {
      content_name: 'Senvia OS Registration',
      content_category: 'signup',
    },
  },
});
```

### Nota sobre o link do anúncio

O Meta Ads adiciona automaticamente o `?fbclid=xxx` ao URL de destino. Se o link de destino for `senvia.pt/senvia-os`, o `fbclid` fica nesse domínio. Para resolver:

**Opção A**: O botão CTA em `senvia.pt/senvia-os` deve passar o `fbclid` para o URL de registo:
```
https://senvia-portugal-crm.lovable.app/?tab=signup&fbclid={valor_do_fbclid}
```

**Opção B** (mais simples): Mudar o URL de destino do anúncio diretamente para `https://senvia-portugal-crm.lovable.app/?tab=signup` — assim o `fbclid` já fica no domínio correto.

