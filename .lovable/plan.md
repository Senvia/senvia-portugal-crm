

# Reforçar Anti-Alucinação do Otto (Zero Tolerância)

## Problema
Apesar de já existir uma regra no system prompt, o modelo continua a inventar dados quando uma ferramenta falha ou não retorna resultados. A regra atual não é suficientemente forte.

## Solução (3 camadas de proteção)

### 1. Reescrever as regras anti-alucinação no system prompt

Tornar as regras muito mais explícitas e repetitivas (modelos de IA respondem melhor a instruções repetidas e enfáticas):

```
REGRAS DE ACESSO A DADOS (OBRIGATÓRIAS — VIOLAÇÃO = ERRO CRÍTICO):
- Responde EXCLUSIVAMENTE com dados retornados pelas ferramentas. Zero exceções.
- Se uma ferramenta retornar erro ou zero resultados, diz: "Não encontrei resultados para [termo]."
- NUNCA inventes nomes de clientes, referências, valores, datas ou qualquer outro dado.
- NUNCA "suponhas" dados. Se não tens resultados reais, NÃO os fabricas.
- Se o utilizador perguntar algo que exige dados e não tens ferramentas disponíveis, diz que não tens acesso a essa informação.
- Quando mostras dados, eles TÊM de vir diretamente do resultado da ferramenta executada.
```

### 2. Validar tool results antes de enviar ao modelo

Quando uma ferramenta retorna erro, injetar no resultado da ferramenta uma instrução explícita para que o modelo não invente:

```typescript
// No executeTool, caso de erro:
if (error) return JSON.stringify({ 
  error: error.message, 
  _instruction: "ERRO NA PESQUISA. Informa o utilizador que não foi possível pesquisar. NÃO INVENTES DADOS." 
});

// Caso de zero resultados:
if (!data || data.length === 0) return JSON.stringify({ 
  results: [], 
  count: 0, 
  _instruction: "ZERO RESULTADOS. Informa o utilizador que não encontraste resultados. NÃO INVENTES DADOS." 
});
```

### 3. Adicionar `temperature: 0` nas chamadas ao modelo

Reduzir a criatividade do modelo a zero para evitar que "preencha lacunas":

```typescript
const payload = {
  model: "google/gemini-3-flash-preview",
  messages: conversationMessages,
  stream: false,
  temperature: 0,  // <- novo
};
```

## Ficheiros a alterar
- `supabase/functions/otto-chat/index.ts` -- system prompt + validação de resultados + temperature

## Resultado
O Otto passará a responder apenas com dados reais do sistema. Se não encontrar, dirá explicitamente que não encontrou, sem inventar.
