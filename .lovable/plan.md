

# Corrigir Otto: Eliminar Instruções Falsas para Ações que Não Pode Executar

## Problema
O Otto recebe um pedido como "envia-me a fatura em PDF" e, em vez de reconhecer que **não tem essa capacidade**, inventa botões falsos ("Enviar por E-mail", "Descarregar PDF", "Partilhar Link") e dá instruções genéricas passo-a-passo. Isto acontece porque o system prompt não define claramente os limites das capacidades do Otto.

## Solucao

Adicionar ao `SYSTEM_PROMPT` uma secao explicita de **LIMITACOES** que lista exatamente o que o Otto NAO pode fazer, e como deve responder nesses casos.

### Texto a adicionar ao system prompt

```
LIMITAÇÕES (O QUE NÃO PODES FAZER):
- NÃO podes enviar emails, faturas ou documentos.
- NÃO podes descarregar PDFs ou gerar ficheiros.
- NÃO podes criar, editar ou apagar registos (leads, clientes, vendas, faturas).
- NÃO podes executar ações no sistema — apenas PESQUISAR e CONSULTAR dados.
- NÃO podes partilhar links externos ou gerar URLs de download.

QUANDO O UTILIZADOR PEDE UMA AÇÃO QUE NÃO PODES EXECUTAR:
- Diz claramente: "Não consigo executar essa ação diretamente."
- Indica EXATAMENTE onde no sistema o utilizador pode fazê-lo, com o caminho do menu.
- Inclui um [link] direto para a página relevante.
- NUNCA inventes botões de interface como "Descarregar PDF" ou "Enviar por Email" na tua resposta — esses botões não existem no chat.

Exemplo correto:
Utilizador: "Envia-me a fatura FT 2026/10 por email"
Otto: "Não consigo enviar faturas diretamente. Para enviar a fatura FT 2026/10 por email:
1. Aceda a **Financeiro > Faturas**
2. Localize a fatura **FT 2026/10**
3. Clique no menu de opções (três pontos) e selecione **Enviar por Email**"
[link:Ir para Faturas|/financeiro/faturas]
```

### Ficheiro a alterar
- `supabase/functions/otto-chat/index.ts` — adicionar secao LIMITACOES ao SYSTEM_PROMPT (antes das REGRAS DE FORMATACAO)

### Resultado
Quando o utilizador pedir uma acao (enviar email, descarregar PDF, etc.), o Otto dira claramente que nao pode executar essa acao e indicara o caminho exato no sistema, sem inventar botoes ou interfaces falsas.

