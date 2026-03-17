
Objetivo

Alterar o modal de detalhe da campanha para mostrar:
- desktop: layout dividido 50/50
- mobile: abas entre “Dados” e “Preview”

O que confirmei no código

- O modal é `src/components/marketing/CampaignDetailsModal.tsx`.
- Hoje ele usa um layout centrado com uma única coluna (`max-w-3xl`) e mostra apenas métricas, infos e destinatários.
- A campanha já traz os campos necessários para montar o preview:
  - `campaign.html_content`
  - `campaign.subject`
  - `campaign.template?.subject`
- O projeto já tem um padrão pronto para preview de email em `src/components/marketing/TemplateEditor.tsx`:
  - preview em `iframe`
  - `sandbox="allow-same-origin"`
  - fallback visual quando não há conteúdo

Abordagem

1. Reestruturar o conteúdo do modal
- Manter o header atual.
- Substituir a área principal por:
  - desktop: `grid grid-cols-1 lg:grid-cols-2`
  - coluna esquerda = dados do email
  - coluna direita = preview do email
- Remover a limitação `max-w-3xl` desta área para o split ocupar melhor o ecrã.

2. Coluna esquerda: dados do email
- Manter todo o conteúdo já existente:
  - métricas
  - progresso
  - informações da campanha
  - lista de destinatários com pesquisa/filtros
- Colocar esta coluna dentro de uma `ScrollArea` própria para não depender do scroll da coluna do preview.

3. Coluna direita: preview do email
- Criar um preview com `iframe`, semelhante ao usado no editor de templates.
- Renderizar o conteúdo com base em:
  - `campaign.html_content`, quando existir
  - caso contrário, usar fallback simples com:
    - assunto
    - mensagem de que o conteúdo vem do template e não está guardado diretamente na campanha
- Mostrar um card/título “Preview do email”.

4. Comportamento mobile em abas
- Em mobile/tablet pequeno, usar `Tabs` com duas secções:
  - `Dados`
  - `Preview`
- Isto evita um modal demasiado comprido e segue exatamente a tua preferência.

5. Preservar o comportamento atual
- Não mexer em:
  - sync dos envios
  - filtros de destinatários
  - métricas
  - estados da campanha
- A mudança será só de layout e apresentação.

Detalhe técnico

Ficheiro a ajustar:
- `src/components/marketing/CampaignDetailsModal.tsx`

Estrutura prevista:
```text
Header fixo
└── Conteúdo
    ├── Mobile: Tabs
    │   ├── Dados
    │   └── Preview
    └── Desktop: 2 colunas 50/50
        ├── Esquerda: dados
        └── Direita: iframe preview
```

Notas importantes

- Para campanhas criadas a partir de template, pode acontecer o HTML final não estar em `campaign.html_content`. Nesse caso, o preview pode ficar limitado se o conteúdo não tiver sido persistido na campanha.
- Se quiseres, numa segunda fase posso também planear uma melhoria para guardar sempre uma “snapshot” do HTML final da campanha, garantindo preview completo em todas as campanhas.

Resultado esperado

- Ao abrir uma campanha criada/agendada/enviada:
  - no desktop, a tela fica claramente dividida em duas metades
  - na esquerda vês dados e destinatários
  - na direita vês o preview real do email
- No mobile, alternas entre abas “Dados” e “Preview” sem perder legibilidade.
