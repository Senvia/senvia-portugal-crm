

# Remover Afirmações Iniciais do Otto

## Problema
O Otto começa quase sempre as respostas com frases de afirmação como "Claro!", "Com certeza!", "Sem problema!", "Entendido!" antes de dar a resposta real. Isto torna a experiência repetitiva e pouco profissional.

## Causa
O system prompt não tem nenhuma instrução explícita a proibir isto, e o modelo de IA tende naturalmente a "validar" o pedido do utilizador antes de responder.

## Solução
Adicionar uma regra clara no system prompt (`supabase/functions/otto-chat/index.ts`) a proibir afirmações/validações iniciais.

## Alteração em `supabase/functions/otto-chat/index.ts`

Adicionar ao bloco de "REGRAS DE FORMATAÇÃO" do system prompt:

```
- NUNCA comeces a resposta com afirmações ou validações como "Claro!", "Com certeza!", "Sem problema!", "Entendido!", "Boa pergunta!", "Ótima escolha!", "Perfeito!". Vai direto ao assunto sem preâmbulos.
```

Apenas uma linha adicional no prompt. Nenhuma outra alteração necessária.

## Ficheiro a alterar
- `supabase/functions/otto-chat/index.ts` (1 linha no system prompt)

