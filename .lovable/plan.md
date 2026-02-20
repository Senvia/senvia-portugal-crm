
## Adicionar Tooltip/Balão de Ajuda ao Botão do Otto

### Objetivo

Adicionar uma pequena mensagem flutuante acima do ícone do Otto (FAB) para que os utilizadores saibam que ele está ali para ajudar. A mensagem aparece automaticamente e pode ser fechada pelo utilizador.

### Implementação

**Ficheiro:** `src/components/otto/OttoFAB.tsx`

- Adicionar um balão (tooltip/bubble) posicionado acima do botão FAB do Otto
- A mensagem será algo como: **"Precisa de ajuda? Pergunte-me sobre o Senvia OS!"**
- O balão aparece automaticamente quando o Otto não está aberto
- O utilizador pode fechar o balão clicando num "X" pequeno
- Usar `localStorage` para guardar se o utilizador já fechou o balão (para não voltar a aparecer sempre)
- Incluir uma pequena "seta" a apontar para baixo (estilo speech bubble)
- Animação suave de entrada com framer-motion (fade in + slide up)

### Design

- Fundo escuro (`bg-card`) com borda (`border-border`), cantos arredondados
- Texto pequeno (`text-xs`) em 1-2 linhas
- Botão "X" discreto no canto superior direito do balão
- Seta triangular na parte inferior a apontar para o botão do Otto
- Largura máxima de ~200px para não ocupar muito espaço
- Posicionado logo acima do FAB, alinhado à direita

### Lógica de Exibição

- Mostrar o balão apenas quando o chat do Otto **não está aberto**
- Esconder permanentemente após o utilizador clicar no "X" (persistido via `localStorage`)
- Esconder automaticamente quando o utilizador abre o Otto pela primeira vez

### Ficheiros Alterados

- `src/components/otto/OttoFAB.tsx` - adicionar o balão de ajuda com lógica de visibilidade
