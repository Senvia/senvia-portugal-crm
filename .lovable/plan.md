

## Fix: Otto bugado ao abrir suporte

### Problema identificado (2 causas)

**1. Resposta duplicada (double-call):** Quando o Otto termina de processar (sem mais tools), o edge function faz uma SEGUNDA chamada streaming ao modelo com as mesmas mensagens. Isto gera uma resposta DIFERENTE da original, causando inconsistências — o Otto pode saltar passos, reordenar perguntas ou perder contexto.

**2. Botão "Abrir Ticket" sempre visível:** O botão "Abrir Ticket de Suporte" no fundo do chat está SEMPRE visível, mesmo quando o Otto já está a meio de recolher dados para um ticket. Se o utilizador clica, envia "Preciso de abrir um ticket de suporte" que reinicia todo o fluxo.

### Correções

#### 1. `supabase/functions/otto-chat/index.ts` — Eliminar double-call
- Quando o modelo retorna uma resposta final (sem tool_calls), usar `assistantMessage.content` diretamente, embrulhando-o em SSE manualmente — em vez de fazer uma segunda chamada streaming ao modelo.
- Isto garante que a resposta que o modelo gerou (com contexto dos tool results) é a que o utilizador recebe, sem regeneração.

```typescript
// Linha ~966: Em vez de fazer nova chamada streaming, devolver o content diretamente
if (assistantMessage.content) {
  const simpleSSE = `data: ${JSON.stringify({ choices: [{ delta: { content: assistantMessage.content } }] })}\n\ndata: [DONE]\n\n`;
  return new Response(simpleSSE, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}
```

#### 2. `src/components/otto/OttoChatWindow.tsx` — Esconder botão de ticket durante fluxo
- Detectar se a conversa já contém mensagens sobre "ticket de suporte" e esconder o botão nesse caso.
- Condição: se alguma mensagem do assistente contém "assunto do teu ticket" ou "ticket" nos últimos N mensagens, esconder o botão.

### Resultado
- Respostas consistentes do Otto (sem regeneração)
- Utilizador não reinicia acidentalmente o fluxo de ticket
- 2 ficheiros editados

