## Objectivo

Adicionar **1 segundo webhook de entrada** para a Escolha Inteligente, que entrega 100% dos leads ao **Daniel**. O webhook actual (round-robin entre a equipa) mantém-se exactamente como está.

## Como vai funcionar

A organização passa a ter **2 URLs de webhook**:

1. **Webhook actual** (já em uso no Make/Zapier) → continua round-robin para a equipa.
2. **Webhook novo "Daniel"** → todos os leads vão directos para o Daniel, sem round-robin.

Em **Definições → Integrações** aparece uma nova secção pequena chamada **"Webhook Dedicado (Daniel)"** com:
- A URL única
- Botão **Copiar**
- Toggle **Activo/Inactivo**

Cola-se a URL no novo cenário do Make/Zapier e está feito.

## Implementação técnica

### 1. Base de dados
Adicionar 2 colunas em `organizations`:
- `webhook_token_dedicated` (text, único, gerado automaticamente)
- `webhook_dedicated_user_id` (uuid, aponta para o user que recebe tudo)

Não preciso de tabela nova — é uma extensão simples do que já existe.

### 2. Edge function `submit-lead`
Nova rota de validação no início:
- Se o `token` da request bater com `webhook_token_dedicated` da organização → atribui directamente ao `webhook_dedicated_user_id`, **salta o round-robin**, respeita o resto do fluxo (deduplicação, custom_data, n8n, notificações, etc.).
- Caso contrário → fluxo actual intacto.

### 3. UI
Em `IntegrationsContent.tsx`, adicionar um cartão pequeno por baixo do webhook actual:
- Mostra a URL do webhook dedicado + botão copiar.
- Selector do utilizador responsável (default: Daniel para a Escolha Inteligente).
- Botão "Gerar novo token" caso queira invalidar.

### 4. Setup imediato após deploy
Eu próprio configuro na base de dados:
- Gero o `webhook_token_dedicated` para a Escolha Inteligente.
- Defino `webhook_dedicated_user_id` = Daniel.
- Devolvo-te a URL pronta para colar no Make.

## Ficheiros alterados
- 1 migration (2 colunas em `organizations`)
- `supabase/functions/submit-lead/index.ts` (handler dedicado, ~30 linhas)
- `src/components/settings/IntegrationsContent.tsx` (novo cartão)
- `src/hooks/useOrganization.ts` (expor os 2 novos campos)

## Compatibilidade
Zero impacto no webhook existente. Continua a funcionar exactamente como hoje.
