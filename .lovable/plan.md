
# Otto com Links de Navegacao Diretos

## Objetivo
Quando o utilizador pergunta algo como "quero criar formularios", o Otto responde com um link clicavel que navega diretamente para a pagina correta dentro do Senvia OS.

## Como Funciona

O Otto ja usa o formato `[botao:Texto]` para botoes interativos. Vamos adicionar um novo formato `[link:Texto|/caminho]` que renderiza como um botao clicavel que navega para a pagina indicada.

Exemplo de resposta do Otto:
```
Para criar um formulario, va a Definicoes > Formulario.
[link:Ir para Formularios|/settings]
[botao:Preciso de ajuda com formularios]
```

## Alteracoes

### 1. `supabase/functions/otto-chat/index.ts` (System Prompt)
- Adicionar ao prompt a instrucao do novo formato `[link:Texto|/caminho]`
- Incluir o mapa completo de rotas do sistema para o Otto saber que links gerar
- Atualizar os exemplos de interacao para incluir links
- Rotas mapeadas:
  - `/dashboard` - Painel
  - `/leads` - Leads
  - `/clients` - Clientes
  - `/calendar` - Agenda
  - `/proposals` - Propostas
  - `/sales` - Vendas
  - `/finance` - Financeiro
  - `/marketing` - Marketing
  - `/marketing/templates` - Templates de email
  - `/marketing/lists` - Listas de contactos
  - `/marketing/campaigns` - Campanhas
  - `/ecommerce` - E-commerce
  - `/settings` - Definicoes (Geral, Pipeline, Formularios, Campos, Integracao, etc.)

### 2. `src/components/otto/OttoMessage.tsx`
- Adicionar funcao `parseLinks` que extrai `[link:Texto|/caminho]` do conteudo
- Renderizar os links como botoes com icone `ExternalLink` e cor primaria
- Ao clicar, usar `useNavigate` do React Router para navegar para o caminho e fechar o Otto
- Os links aparecem abaixo dos botoes de acao existentes

### 3. `src/components/otto/OttoChatWindow.tsx`
- Passar a funcao `onClose` para o `OttoMessageComponent` para que ao clicar num link, o chat feche automaticamente e o utilizador veja a pagina de destino

## Detalhe Tecnico

### Novo parser no OttoMessage:
```text
Input:  "Va a Definicoes > Formulario. [link:Abrir Formularios|/settings]"
Output: { cleanContent: "Va a Definicoes > Formulario.", links: [{ label: "Abrir Formularios", path: "/settings" }] }
```

### Renderizacao dos links:
- Botao com `variant="default"` (cor primaria) para se distinguir dos botoes de acao (outline)
- Icone `ExternalLink` para indicar navegacao
- Ao clicar: `navigate(path)` + `onClose()`

## Resultado
- O Otto passa a guiar o utilizador com links diretos
- Um clique leva o utilizador exatamente onde precisa
- Experiencia mais fluida e profissional
