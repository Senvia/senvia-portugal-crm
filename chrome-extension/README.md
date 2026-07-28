# Senvia OS — extensão para o WhatsApp Web

Painel do CRM Senvia injetado ao lado das conversas em `web.whatsapp.com`.
Mostra a ficha do contacto, notas, tarefas, propostas e vendas — resolvidas pelo
número de telefone da conversa aberta.

Estado: **MVP funcional (modo leve)**. Não requer alterações no backend.

## O que faz

| | |
|---|---|
| Ficha CRM | Encontra o lead/cliente pelos últimos 9 dígitos do número (mesma chave do inbox Senvia). Cria lead se não existir. |
| Notas | Timeline partilhada com o CRM (`contact_notes`) — ler e escrever. |
| Tarefas | `inbox_tasks` do contacto — criar, concluir, ver sugestões da IA. |
| Propostas e vendas | Leitura, com link direto para a ficha no CRM. |

O que **não** faz (fica no inbox do Senvia): atribuir, etiquetas, arquivar,
não-lidas, agendadas. Essas vivem no Chatwoot e precisam de resolver
`telefone → conversation_id` primeiro — ver "Próximos passos".

## Arquitetura

```
web.whatsapp.com
 └─ content.js  (isolated world)
     ├─ lê o JID do chat aberto  → data-id das linhas de mensagem
     ├─ injeta <iframe src="chrome-extension://…/panel.html">  em position:fixed
     └─ postMessage(telefone) → painel

panel.html  (origem chrome-extension://)
 └─ React + supabase-js, sessão própria, fala direto com PostgREST (RLS)

background.js  (service worker)
 └─ só guarda a sessão pareada. Nunca segura o WebSocket (morre aos ~30s).

app.senvia.pt/extension-auth
 └─ passa a sessão à extensão por window.postMessage (mesma origem)
```

Duas decisões que importam:

- **O painel é um iframe fora da árvore React do WhatsApp.** Qualquer nó montado
  dentro dela é apagado no próximo re-render deles. A app é encolhida por CSS
  (`#app { width: calc(100% - 380px) }`), não reparentada.
- **A deteção do chat é um poll de 700ms**, não um `MutationObserver`. É um
  `querySelector` por tick — irrelevante em custo, e imune a eles substituírem
  subárvores inteiras.

## Instalar (desenvolvimento)

```bash
cd chrome-extension
npm install
npm run build          # gera dist/
```

1. Chrome → `chrome://extensions` → ativar **Modo de programador**
2. **Carregar sem compactação** → escolher a pasta `chrome-extension/dist`
3. Abrir o Senvia OS → `/extension-auth` → **Ligar extensão**
4. Abrir `https://web.whatsapp.com` e uma conversa qualquer

`npm run dev` reconstrói em watch; depois é só clicar em recarregar no
`chrome://extensions`.

> A extensão lê a Supabase URL/key do `.env` da raiz do repo (`envDir: '..'`),
> por isso aponta sempre para o mesmo projeto que a app. Não há chaves
> duplicadas aqui.

## Privacidade

A extensão lê **apenas o número de telefone** da conversa aberta, para procurar
a ficha no CRM. Nunca lê nem envia o conteúdo das mensagens. Todo o acesso a
dados passa pelo JWT do próprio utilizador — o RLS do Supabase faz o isolamento
por organização, a extensão não tem acesso privilegiado nenhum.

## Limitações conhecidas

- **Grupos** não têm ficha de CRM (o JID `@g.us` não é um contacto).
- **Modo de privacidade do WhatsApp** (`@lid`): o número fica escondido, não há
  como fazer match. O painel diz isso explicitamente.
- **O DOM do WhatsApp Web é ofuscado e muda.** Toda a fragilidade está isolada
  em `readActiveContact()` + `chatJidFromDataId()` (`src/content.ts`,
  `src/lib/protocol.ts`). Se partir, é aí — e só aí.
- **Sem ícones** ainda: o Chrome mostra o ícone genérico.

## Por validar antes de ir mais longe

1. **Evolution + WhatsApp Web no mesmo número** — coexistem? Quantos slots de
   dispositivo ligado sobram? Isto define o teto de agentes.
2. **Uma resposta escrita direto no WhatsApp Web chega ao Chatwoot?** Se não
   chegar, o histórico parte-se em dois.
3. **Fiabilidade da extração do JID** ao longo de dias de uso real.

## Próximos passos possíveis

- Resolver `telefone → conversation_id` (via `list_conversations`, que já
  devolve `contact_phone`) para desbloquear atribuir/etiquetas/arquivar.
- Realtime: o iframe aguenta o WebSocket do Supabase, dá para atualizar notas e
  tarefas ao vivo.
- Ícones + política de privacidade para submissão à Chrome Web Store
  (listagem *unlisted* serve para entregar só aos clientes).
