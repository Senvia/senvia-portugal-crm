

## Plano: Receber leads do Facebook via Zapier/Make webhook

### Contexto
O cliente quer receber leads do formulário nativo do Facebook sem criar uma Facebook App. A solução é usar Zapier ou Make como ponte: Facebook Lead Ads → Zapier → Webhook Senvia OS.

### O que já existe
- Edge function `submit-lead` que recebe leads externos
- Sistema de webhooks por organização (`organization_webhooks`)
- Formulários públicos com tracking params

### Alterações necessárias

**1. Edge function `submit-lead/index.ts`**
- Adicionar um endpoint/modo "webhook externo" que aceita payloads genéricos (JSON com name, email, phone, etc.)
- Mapear campos comuns do Facebook Lead Ads (full_name, email, phone_number) para o schema interno
- Autenticar via API key da organização (já existe `organization_webhooks.url` com token)
- Retornar 200 com o lead_id criado

**2. Gerar URL de webhook único por organização**
- Na tabela `organization_webhooks`, usar o webhook existente ou criar um dedicado
- URL formato: `https://{supabase_url}/functions/v1/submit-lead?org={org_id}&token={webhook_token}`
- O token serve como autenticação simples

**3. UI nas Definições → Integrações**
- Mostrar a URL do webhook copiável para o cliente colar no Zapier/Make
- Instruções simples: "Cole esta URL como destino no seu Zapier/Make"
- Campo de mapeamento opcional (qual campo do Zapier → qual campo do lead)

### Fluxo do cliente
```text
1. Cria um Zap: Trigger = "Facebook Lead Ads" → Action = "Webhooks by Zapier (POST)"
2. Cola a URL do webhook do Senvia OS
3. Mapeia os campos (name, email, phone)
4. Ativa o Zap
5. Leads aparecem automaticamente no Senvia OS
```

### Ficheiros a alterar
- `supabase/functions/submit-lead/index.ts` — aceitar payload genérico com auth por token
- `src/components/settings/IntegrationsContent.tsx` — secção com URL copiável e instruções
- Possível migração para adicionar coluna `webhook_token` à tabela `organization_webhooks`

