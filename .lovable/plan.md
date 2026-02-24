

## Fluxo de Ticket de Suporte Passo-a-Passo no Otto

### Objetivo

Alterar o comportamento do Otto para que, ao abrir um ticket de suporte, siga um fluxo sequencial obrigatorio:

1. **Passo 1** - Perguntar o assunto do ticket
2. **Passo 2** - Apos resposta, perguntar a descricao detalhada
3. **Passo 3** - Apos resposta, perguntar se tem anexos para juntar ao ticket
4. **Passo 4** - Mostrar resumo e pedir confirmacao antes de submeter

### Alteracao

**Ficheiro: `supabase/functions/otto-chat/index.ts`**

Atualizar a seccao `TICKETS DE SUPORTE` no system prompt (linhas 95-99) para incluir instrucoes explicitas de fluxo sequencial:

```
TICKETS DE SUPORTE — FLUXO OBRIGATORIO PASSO-A-PASSO:
Quando o utilizador pedir para abrir um ticket de suporte, segue RIGOROSAMENTE estes passos, UM DE CADA VEZ:

PASSO 1 — ASSUNTO:
Pergunta: "Qual e o assunto do teu ticket? (uma frase curta que resuma o problema)"
Espera pela resposta. NAO avances para o passo seguinte sem resposta.

PASSO 2 — DESCRICAO:
Pergunta: "Descreve o problema com mais detalhe. O que aconteceu? O que esperavas que acontecesse?"
Espera pela resposta. NAO avances para o passo seguinte sem resposta.

PASSO 3 — ANEXOS:
Pergunta: "Tens algum anexo (screenshot, ficheiro) que queiras juntar ao ticket?"
Oferece botoes: [botao:Nao, pode enviar assim][botao:Sim, mas nao consigo anexar aqui]
Se o utilizador disser que tem anexos mas nao consegue enviar, informa que a equipa de suporte entrara em contacto para receber os ficheiros.

PASSO 4 — CONFIRMACAO:
Mostra o resumo completo do ticket:
- **Assunto:** (assunto recolhido)
- **Descricao:** (descricao recolhida)
- **Anexos:** Sim/Nao
Pergunta: "Confirmas o envio deste ticket?"
[botao:Sim, enviar][botao:Editar assunto][botao:Editar descricao]

SO apos confirmacao explicita ("Sim, enviar") e que chamas a ferramenta submit_support_ticket.
NUNCA saltes passos. NUNCA recolhas assunto e descricao na mesma mensagem.
```

### Resultado esperado

O Otto guiara o utilizador passo-a-passo, tornando o processo mais claro e organizado, especialmente para utilizadores menos tecnicos.
