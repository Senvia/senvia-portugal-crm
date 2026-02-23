
# Otto como Assistente Pessoal com Acesso a Dados

## Resumo
Transformar o Otto de um assistente estatico (so responde com conhecimento do system prompt) num assistente pessoal inteligente que consegue consultar a base de dados da organizacao do utilizador logado. O Otto podera buscar faturas, leads, clientes, vendas e muito mais -- tudo com perguntas de clarificacao antes de pesquisar.

## Arquitetura da Solucao

A abordagem usa um sistema de **function calling** (tool use) do modelo de IA. Em vez de dar ao Otto acesso SQL direto, definimos "ferramentas" que o Otto pode chamar, e a edge function executa as queries de forma segura.

### Fluxo de funcionamento:

```text
1. Utilizador pergunta: "Preciso da fatura do cliente Joao"
2. Frontend envia mensagem + auth token + organization_id
3. Edge function envia ao modelo com tools disponiveis
4. Modelo responde com tool_call: search_invoices({ client_name: "Joao" })
5. Edge function executa a query na BD (filtrada por org_id)
6. Resultado e injetado na conversa como mensagem de sistema
7. Modelo formula resposta final com os dados encontrados
8. Resposta e enviada em streaming ao utilizador
```

## Alteracoes Detalhadas

### 1. Frontend: `src/hooks/useOttoChat.ts`
- Passar o **auth token** (JWT) e **organization_id** no pedido ao edge function
- Obter estes valores do `AuthContext`
- O token garante que o Otto so acede a dados do utilizador autenticado

### 2. Frontend: `src/components/otto/OttoChatWindow.tsx`
- Passar `organizationId` ao hook `useOttoChat`

### 3. Edge Function: `supabase/functions/otto-chat/index.ts` (reescrita major)

**Autenticacao:**
- Extrair o JWT do header Authorization
- Validar com `getClaims()` para obter o `user_id`
- Receber `organization_id` no body e validar membership

**Definicao de Tools (ferramentas do Otto):**
O modelo recebe uma lista de tools que pode invocar:

| Tool | Descricao | Parametros |
|------|-----------|------------|
| `search_clients` | Procurar clientes por nome, email, NIF | `query`, `field` |
| `search_leads` | Procurar leads por nome, email, telefone | `query`, `status` |
| `search_invoices` | Procurar faturas por referencia ou cliente | `query`, `status` |
| `search_sales` | Procurar vendas por codigo ou cliente | `query`, `payment_status` |
| `search_proposals` | Procurar propostas por codigo ou cliente | `query`, `status` |
| `get_client_details` | Detalhes completos de um cliente | `client_id` |
| `get_sale_details` | Detalhes de uma venda com pagamentos | `sale_id` |
| `get_pipeline_summary` | Resumo do pipeline (contagens por etapa) | -- |
| `get_finance_summary` | Resumo financeiro (faturado, pendente, etc.) | -- |
| `get_upcoming_events` | Proximos eventos da agenda | `days` |

**Loop de Tool Calling:**
- Enviar mensagens + tools ao modelo (sem streaming na primeira chamada)
- Se o modelo retorna `tool_calls`, executar cada tool contra a BD
- Injetar resultados como mensagens `tool` na conversa
- Chamar o modelo novamente (agora com streaming) para a resposta final
- Maximo de 3 iteracoes para evitar loops infinitos

**Execucao segura das queries:**
- Usar `createClient` com `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`
- Todas as queries filtradas por `organization_id` (nunca expor dados de outra org)
- Limitar resultados a 10 registos por query
- Nunca retornar dados sensiveis (passwords, API keys, tokens)

### 4. System Prompt: Atualizacao

Adicionar ao prompt do Otto:
- Instrucao de que agora tem acesso a dados reais da organizacao
- Deve SEMPRE fazer perguntas de clarificacao antes de pesquisar (ex: "Qual o nome do cliente?")
- Quando encontra resultados, deve formata-los de forma clara e legivel
- Se nao encontra resultados, sugerir termos alternativos
- Nunca inventar dados -- so mostrar o que vem da BD
- Pode usar links de navegacao para levar o utilizador ao registo encontrado

### 5. Formato de resposta com dados

Quando o Otto encontra dados, apresenta-os assim:
```text
Encontrei a fatura do cliente Joao Silva:

- **Referencia**: FT 2024/152
- **Valor**: 1.500,00 EUR
- **Estado**: Paga
- **Data**: 15/01/2024

[link:Ver Venda|/sales]
[botao:Procurar outra fatura]
```

## Seguranca

- O JWT e validado server-side -- nao ha acesso anonimo
- Todas as queries filtradas por `organization_id` validado
- Service role key usada apenas no backend (nunca exposta)
- Resultados limitados a 10 registos
- Campos sensiveis (API keys, tokens, passwords) nunca incluidos nas respostas
- O Otto nao pode modificar dados -- apenas consultar (SELECT)

## Secao Tecnica: Estrutura do Tool Calling

```text
// Pedido ao modelo com tools
{
  model: "google/gemini-3-flash-preview",
  messages: [...],
  tools: [
    {
      type: "function",
      function: {
        name: "search_clients",
        description: "Procurar clientes na BD",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Termo de pesquisa" }
          },
          required: ["query"]
        }
      }
    },
    // ... mais tools
  ]
}

// Resposta do modelo (quando quer usar tool)
{
  choices: [{
    message: {
      tool_calls: [{
        id: "call_123",
        function: {
          name: "search_clients",
          arguments: '{"query": "Joao"}'
        }
      }]
    }
  }]
}

// Edge function executa e reenvia ao modelo
messages: [
  ...previous,
  { role: "assistant", tool_calls: [...] },
  { role: "tool", tool_call_id: "call_123", content: JSON.stringify(results) }
]
```

## Ficheiros a Alterar
1. `supabase/functions/otto-chat/index.ts` -- reescrita com autenticacao, tools e loop
2. `src/hooks/useOttoChat.ts` -- enviar auth token e org_id
3. `src/components/otto/OttoChatWindow.tsx` -- passar dados de auth ao hook
