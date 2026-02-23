
# Injetar Data e Hora Atual no Otto

## Problema
O system prompt do Otto nao inclui a data atual. O modelo assume que estamos em 2024 (data do treino). Quando o utilizador pergunta "quantos leads tenho este mes?" ou qualquer pergunta temporal, o Otto nao sabe que mes/ano e.

## Solucao

Injetar a data e hora real de Portugal no momento da mensagem, adicionando-a ao system prompt dinamicamente.

### Alteracao no ficheiro `supabase/functions/otto-chat/index.ts`

Na zona onde se constroi o `systemContent` (linha ~612), adicionar a data atual formatada em PT-PT antes de enviar ao modelo:

```typescript
// Gerar data atual em PT-PT (fuso horario de Lisboa)
const now = new Date();
const dateStr = now.toLocaleDateString('pt-PT', { 
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  timeZone: 'Europe/Lisbon' 
});
const timeStr = now.toLocaleTimeString('pt-PT', { 
  hour: '2-digit', minute: '2-digit',
  timeZone: 'Europe/Lisbon' 
});
const dateContext = `\n\nDATA E HORA ATUAL: ${dateStr}, ${timeStr} (hora de Lisboa). Usa SEMPRE esta data como referencia temporal. "Este mes" = mes atual desta data. "Hoje" = esta data.`;

const systemContent = SYSTEM_PROMPT + dateContext + systemPromptExtra + ...;
```

### Resultado
- O Otto sabera sempre a data e hora real
- Perguntas como "leads deste mes", "vendas de hoje", "faturas desta semana" funcionarao corretamente
- O fuso horario sera sempre Portugal (Europe/Lisbon)

### Ficheiro a alterar
- `supabase/functions/otto-chat/index.ts` -- injecao dinamica da data no system prompt
