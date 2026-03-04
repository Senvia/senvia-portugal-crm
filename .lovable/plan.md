

## Diagnóstico

Atualmente, o evento **Lead** do Meta Pixel é disparado apenas no **browser** (client-side) via `fbq('track', 'Lead', ...)`. Se o utilizador tiver um ad blocker, modo privado, ou o script do Facebook não carregar, o evento perde-se. A **Conversions API (CAPI)** envia o evento diretamente do servidor para o Facebook, garantindo 100% de entrega.

Existem **dois cenários** onde o Lead é disparado:
1. **Formulários públicos** (`submit-lead` edge function) — leads de clientes
2. **Registo no Senvia OS** (`Login.tsx`) — signups na plataforma (Pixel fixo `2027821837745963`)

## Plano: Implementar Meta Conversions API

### Requisitos

A CAPI precisa de:
- **Pixel ID** — já existe (fixo `2027821837745963` para signups; dinâmico por organização nos formulários via `meta_pixels`)
- **Access Token** — token de acesso da CAPI gerado no Meta Events Manager

### 1. Guardar o Access Token como secret

Usar o tool `add_secret` para pedir o **META_CONVERSIONS_API_TOKEN** (token gerado em Meta Events Manager > Settings > Conversions API > Generate Access Token).

### 2. Adicionar envio CAPI no `submit-lead` edge function

Após criar o lead com sucesso, enviar o evento server-side para cada pixel ativo do formulário:

```
POST https://graph.facebook.com/v21.0/{PIXEL_ID}/events
```

Payload:
- `event_name`: `Lead`
- `event_time`: timestamp unix
- `event_id`: `lead.id` (para deduplicação com o evento browser)
- `action_source`: `website`
- `user_data`: email (hashed SHA256), phone (hashed SHA256), client IP, user agent
- `custom_data`: `content_name`, `content_category`

O `event_id` já é enviado no browser (`eventID: leadId`), o que permite ao Facebook deduplicar automaticamente.

### 3. Criar edge function `meta-capi-event` (reutilizável)

Uma edge function dedicada que recebe:
- `pixel_id`, `access_token` (ou usa o secret global), `event_name`, `event_id`, `user_data`, `custom_data`

Isto permite reutilizar para signups e leads.

### 4. Disparar CAPI no registo (Login.tsx)

No `handleSignUp`, após criar o user, chamar a edge function `meta-capi-event` com o Pixel fixo e o email do utilizador.

### 5. Suporte a Access Token por organização (opcional)

Adicionar coluna `meta_capi_token` na tabela `organizations` para organizações que queiram usar o seu próprio token CAPI. Se não existir, usar o token global do Senvia.

### Ficheiros a criar/alterar

| Ficheiro | Ação |
|---|---|
| `supabase/functions/meta-capi-event/index.ts` | **Criar** — edge function reutilizável para envio CAPI |
| `supabase/functions/submit-lead/index.ts` | **Alterar** — chamar CAPI após criar lead |
| `src/pages/Login.tsx` | **Alterar** — chamar CAPI edge function após signup |
| `supabase/config.toml` | **Alterar** — registar nova function |

### Pré-requisito

Antes de implementar, é necessário o **META_CONVERSIONS_API_TOKEN**. Este token é gerado no Meta Business Suite:
1. Ir a **Events Manager** > selecionar o Pixel
2. **Settings** > **Conversions API** > **Generate Access Token**
3. Copiar o token gerado

