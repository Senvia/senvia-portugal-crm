
Objetivo

Ajustar a página de Leads para:
1. deixar o filtro de Colaboradores um pouco maior;
2. mover as etapas/status dos leads para uma linha abaixo do filtro de colaborador e dos filtros de período.

O que identifiquei no código

- O filtro de colaborador está em `src/components/dashboard/TeamMemberFilter.tsx`.
- Na página `src/pages/Leads.tsx`, ele está a ser renderizado com `className="w-[160px] shrink-0"`.
- Hoje, no separador `pipeline`, o layout está assim na mesma linha:
  - filtro de colaborador
  - período (`De` / `Até`)
  - toggle de vista
  - tipologia
  - etapas/status dos leads em badges
  - limpar filtros
- As etapas estão no bloco:
  - `hidden md:flex items-center gap-2`
  - por isso aparecem alinhadas horizontalmente na mesma barra.

Implementação proposta

1. Aumentar o filtro de Colaboradores
- Em `src/pages/Leads.tsx`, aumentar a largura passada ao `TeamMemberFilter`.
- Em vez de `w-[160px]`, usar algo como:
  - `w-[200px]` ou `w-[220px]` no desktop
  - mantendo comportamento responsivo em telas menores
- Não preciso alterar a lógica do componente; só o tamanho visual no Leads.

2. Separar o topo do pipeline em duas linhas
- Reestruturar o bloco de filtros do `activeTab === 'pipeline'` em:
  - Linha 1: colaborador + período + restantes filtros principais
  - Linha 2: etapas/status dos leads
- Isso deixa a leitura mais limpa e evita que as badges disputem espaço com os filtros.

Estrutura desejada

```text
Linha 1:
[Colaborador maior] [De] [Até] [Tipologia] [Toggle vista] [Limpar]

Linha 2:
[Etapa 1] [Etapa 2] [Etapa 3] [Etapa 4] ...
```

3. Manter comportamento mobile consistente
- No mobile, já existe um `Select` para status, separado das badges de desktop.
- Vou manter essa lógica.
- A mudança principal fica no layout desktop/tablet, sem quebrar a experiência móvel.

4. Preservar filtros e ações atuais
- Não vou mexer na lógica de:
  - seleção de colaborador
  - filtro por datas
  - tipologia
  - limpar filtros
  - troca kanban/tabela
- A alteração será só visual/estrutural.

Ficheiros a ajustar

- `src/pages/Leads.tsx`
- opcionalmente `src/components/dashboard/TeamMemberFilter.tsx` apenas se eu quiser melhorar o comportamento visual interno, mas em princípio não é necessário

Resultado esperado

- O filtro de Colaboradores fica visivelmente maior e mais confortável de usar.
- As etapas dos leads deixam de ficar espremidas na mesma linha dos filtros.
- A barra superior da página de Leads fica mais organizada e clara.

Detalhe técnico

A mudança mais limpa é reorganizar o container do `pipeline` para algo como:
- um wrapper vertical (`flex flex-col gap-3`)
- primeira linha com os filtros principais (`flex flex-wrap items-center gap-2`)
- segunda linha com as badges de status (`hidden md:flex flex-wrap gap-2`)

Assim resolves o layout sem alterar a lógica de dados nem o comportamento dos filtros.
