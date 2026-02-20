

## Otto - Assistente IA Integrado no Senvia OS

Chatbot inteligente que fica no canto inferior direito da aplicacao, ajudando os utilizadores com duvidas sobre o sistema atraves de um fluxo conversacional com botoes de acao rapida.

### Experiencia do Utilizador

O Otto aparece como um botao flutuante (FAB) no canto inferior direito. Ao clicar, abre-se uma janela de chat com:

1. Mensagem de boas-vindas do Otto com botoes de topicos frequentes
2. O utilizador clica num botao ou escreve uma duvida
3. O Otto responde com um passo-a-passo claro, podendo incluir novos botoes para aprofundar
4. As respostas sao renderizadas com markdown para formatacao rica

```text
+---------------------------+
|  Otto - Assistente        |
|---------------------------|
|  Ola! Sou o Otto, o teu  |
|  assistente Senvia OS.    |
|  Como posso ajudar?       |
|                           |
|  [Como criar um lead?]    |
|  [Gerir pipeline]         |
|  [Enviar proposta]        |
|  [Configurar WhatsApp]    |
|                           |
|  ________________________ |
|  | Escreve aqui...    [>]||
+---------------------------+
```

### Arquitetura

```text
Frontend (React)                  Backend (Edge Function)              Lovable AI
   |                                    |                                  |
   |-- Mensagem do user -------------->|                                  |
   |                                    |-- System prompt + contexto ---->|
   |                                    |<-- Stream de tokens ------------|
   |<-- SSE stream de tokens -----------|                                  |
   |                                    |                                  |
   | Renderiza tokens em tempo real     |                                  |
```

### Componentes a Criar

**1. Edge Function: `otto-chat/index.ts`**
- Recebe as mensagens do utilizador
- Usa Lovable AI (modelo `google/gemini-3-flash-preview`) com streaming
- System prompt especializado com conhecimento completo do Senvia OS:
  - Navegacao (como chegar a cada pagina)
  - Funcionalidades (leads, clientes, vendas, propostas, calendario, marketing, financeiro)
  - Configuracoes (pipeline, formularios, equipa, integracao WhatsApp)
  - Fluxos comuns (criar lead, converter em cliente, enviar proposta, registar venda)
- Instrucao no prompt para o Otto sugerir botoes no formato `[botao:texto]` quando relevante
- Suporte a streaming SSE para respostas em tempo real
- Tratamento de erros 429 (rate limit) e 402 (creditos)

**2. Componente: `src/components/otto/OttoFAB.tsx`**
- Botao flutuante (floating action button) no canto inferior direito
- Icone de robot/assistente com animacao subtil
- Badge de notificacao na primeira visita
- No mobile: posicionado acima da bottom nav
- No desktop: canto inferior direito com margem

**3. Componente: `src/components/otto/OttoChatWindow.tsx`**
- Janela de chat responsiva
- Mobile: fullscreen (ocupa todo o ecra)
- Desktop: janela flutuante 380x520px no canto
- Header com nome "Otto" e botao de fechar
- Area de mensagens com scroll
- Input de texto com botao de enviar
- Suporte a Markdown nas respostas (react-markdown sera necessario)

**4. Componente: `src/components/otto/OttoMessage.tsx`**
- Renderiza cada mensagem (user ou assistente)
- Parsing de botoes sugeridos: detecta `[botao:texto]` nas respostas e renderiza como botoes clicaveis
- Animacao de "typing" enquanto o Otto esta a responder
- Avatar do Otto (icone de robot)

**5. Componente: `src/components/otto/OttoQuickActions.tsx`**
- Botoes de acao rapida na mensagem de boas-vindas
- Categorias: Leads, Clientes, Vendas, Configuracoes, etc.
- Ao clicar, envia a pergunta automaticamente

**6. Hook: `src/hooks/useOttoChat.ts`**
- Gestao do estado do chat (mensagens, loading, erro)
- Streaming SSE com parsing token-by-token
- Persistencia das mensagens na sessao (sessionStorage)
- Logica de retry em caso de erro

### Integracao no Layout

**Ficheiro: `src/components/layout/AppLayout.tsx`**
- Adicionar o `<OttoFAB />` dentro do layout principal (tanto mobile como desktop)
- O FAB fica sempre visivel em todas as paginas protegidas

### Detalhes do System Prompt

O Otto sera instruido a:
- Responder APENAS sobre o Senvia OS (nao responder a perguntas fora do ambito)
- Usar linguagem informal e amigavel em Portugues de Portugal
- Dar respostas curtas e objetivas com passos numerados
- Sugerir botoes de follow-up usando o formato `[botao:Como configurar o pipeline?]`
- Nunca inventar funcionalidades que nao existem
- Direcionar para as Definicoes quando necessario

### Dependencias

- Instalar `react-markdown` para renderizar respostas formatadas
- Usar Lovable AI (ja configurado, sem necessidade de API key adicional)

### Ficheiros Alterados/Criados

| Ficheiro | Tipo |
|----------|------|
| `supabase/functions/otto-chat/index.ts` | Novo |
| `src/components/otto/OttoFAB.tsx` | Novo |
| `src/components/otto/OttoChatWindow.tsx` | Novo |
| `src/components/otto/OttoMessage.tsx` | Novo |
| `src/components/otto/OttoQuickActions.tsx` | Novo |
| `src/hooks/useOttoChat.ts` | Novo |
| `src/components/layout/AppLayout.tsx` | Alterado (adicionar FAB) |
| `supabase/config.toml` | Alterado (adicionar funcao) |

### Seguranca

- A edge function valida o token JWT do utilizador (apenas users autenticados podem usar o Otto)
- Nenhum dado sensivel e enviado para a IA - apenas a pergunta do utilizador
- Rate limiting natural do Lovable AI protege contra abuso

