

## Problema

O Otto perde toda a conversa e fecha ao navegar entre paginas porque:

1. O estado `isOpen` no `OttoFAB.tsx` usa `useState(false)` - reseta a cada navegacao
2. O estado `messages` no `useOttoChat.ts` usa `useState([])` - perde todo o historico
3. O `AppLayout` re-renderiza ao mudar de pagina, destruindo ambos os estados

## Solucao

Criar um store global com **Zustand** (ja instalado no projeto) para o Otto, garantindo que tanto o estado aberto/fechado como as mensagens sobrevivem a navegacao entre paginas.

### Alteracoes

**1. Criar `src/stores/useOttoStore.ts`** (novo ficheiro)

Store Zustand com persistencia em `sessionStorage` contendo:
- `isOpen` - se a janela do Otto esta aberta
- `messages` - historico completo de mensagens
- `isLoading` - estado de carregamento
- Acoes: `setOpen`, `addMessage`, `updateLastMessage`, `clearMessages`, `setLoading`

Usamos `sessionStorage` (em vez de `localStorage`) para que a conversa persista durante a sessao de navegacao mas limpe ao fechar o browser - comportamento natural para um chat de suporte.

**2. Refatorar `src/hooks/useOttoChat.ts`**

- Remover os `useState` internos de `messages` e `isLoading`
- Ler e escrever diretamente no store Zustand
- Manter toda a logica de streaming SSE e abort inalterada

**3. Atualizar `src/components/otto/OttoFAB.tsx`**

- Remover o `useState(false)` para `isOpen`
- Usar `isOpen` e `setOpen` do store Zustand
- O resto do componente fica igual

**4. Atualizar `src/components/otto/OttoChatWindow.tsx`**

- Nenhuma alteracao de logica necessaria - ja recebe tudo via `useOttoChat()`
- Apenas garantir que o `onClose` chama `setOpen(false)` do store

### Detalhes Tecnicos

```text
Antes (estado local, perde-se ao navegar):
  OttoFAB [useState: isOpen] 
    -> OttoChatWindow 
      -> useOttoChat [useState: messages]

Depois (estado global, persiste entre paginas):
  Zustand Store (sessionStorage)
    isOpen, messages, isLoading
      |
  OttoFAB [lê isOpen do store]
    -> OttoChatWindow
      -> useOttoChat [lê/escreve messages do store]
```

### Resultado

- O Otto mantem a conversa ao navegar entre Leads, Dashboard, Definicoes, etc.
- O estado aberto/fechado tambem persiste - se o utilizador abre o Otto e muda de pagina, o Otto continua aberto
- Ao fechar o separador do browser, a conversa limpa-se automaticamente (sessionStorage)
- O botao "Limpar conversa" (Trash) continua a funcionar normalmente
