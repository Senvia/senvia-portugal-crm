

## Meta Pixel 2027821837745963 — Rastreamento de Cadastro e Pagamento

### Recomendação Estratégica

Para uma **campanha de vendas** (objectivo: conversões), a melhor estrutura de eventos é:

- **Cadastro** → evento `Lead` — correcto, porque o utilizador ainda não pagou. O Meta optimiza para encontrar pessoas semelhantes que se registam.
- **Pagamento Stripe** → evento `Purchase` — é o evento de conversão final. Podes usar este como objectivo principal da campanha e o `Lead` como evento secundário para optimização do funil.

**Recomendação**: Criar a campanha com objectivo de `Lead` (registos) nas primeiras semanas para acumular dados. Quando tiveres ~50 Purchase events, muda o objectivo para `Purchase` para o algoritmo optimizar directamente para vendas.

---

### Plano Técnico

#### 1. Instalar o Meta Pixel globalmente — `index.html`

Adicionar o script base do Meta Pixel no `<head>` do `index.html`:
```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '2027821837745963');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=2027821837745963&ev=PageView&noscript=1"/></noscript>
```

#### 2. Disparar `Lead` no registo — `src/pages/Login.tsx`

Após o signup bem-sucedido (linha ~308, depois do toast "Conta criada com sucesso"), adicionar:
```typescript
// Fire Meta Pixel Lead event
if (typeof window.fbq === 'function') {
  window.fbq('track', 'Lead', {
    content_name: 'Senvia OS Registration',
    content_category: 'signup',
  });
}
```

Também disparar para o fluxo onde é necessária confirmação de email (linha ~278), pois o cadastro já foi criado:
```typescript
if (typeof window.fbq === 'function') {
  window.fbq('track', 'Lead', {
    content_name: 'Senvia OS Registration',
    content_category: 'signup',
  });
}
```

#### 3. Disparar `Purchase` no retorno do Stripe — `src/components/settings/BillingTab.tsx`

No `useEffect` que detecta `?billing=success` (linha ~39-43), adicionar o evento Purchase:
```typescript
if (params.get('billing') === 'success') {
  // Fire Meta Pixel Purchase event
  if (typeof window.fbq === 'function') {
    window.fbq('track', 'Purchase', {
      content_name: 'Senvia OS Subscription',
      content_category: 'subscription',
      currency: 'EUR',
      value: 0, // Will be filled by Stripe CAPI if configured
    });
  }
  setTimeout(() => checkSubscription(), 2000);
  window.history.replaceState({}, '', window.location.pathname);
}
```

#### 4. Declarar `fbq` para TypeScript — `src/pages/Login.tsx`

Adicionar a declaração global (já existe no ConversationalLeadForm, mas precisa estar acessível):
```typescript
declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
  }
}
```

### Ficheiros a alterar

| Ficheiro | Acção |
|---|---|
| `index.html` | Instalar script base do Meta Pixel |
| `src/pages/Login.tsx` | Disparar evento `Lead` após signup |
| `src/components/settings/BillingTab.tsx` | Disparar evento `Purchase` após pagamento Stripe |

### Nota

Este pixel é da **plataforma Senvia** (não dos clientes). Os clientes configuram os seus próprios pixels nos formulários públicos — essa funcionalidade já existe.

