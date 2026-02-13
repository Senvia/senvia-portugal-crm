
# Redesenho do Importador de Contactos (estilo Brevo)

## Resumo
Redesenhar completamente o `ImportContactsModal` para ser uma pagina/drawer full-screen com um fluxo de importacao profissional inspirado no Brevo, substituindo o dialog pequeno atual por uma experiencia em pagina completa com 4 passos verticais visiveis (accordion/stepper).

---

## Alteracoes

### 1. `src/components/marketing/ImportContactsModal.tsx` -- Reescrita completa

O modal atual (Dialog pequeno com 4 passos em tabs) sera substituido por um **Sheet/Drawer full-screen** com um layout de stepper vertical estilo Brevo:

**Layout geral:**
- Sheet lateral (right) full-width no mobile, 700px no desktop
- Header fixo: "Importar contactos de um arquivo" com descricao e botao fechar
- Separador horizontal
- 4 seccoes verticais numeradas (accordion), onde cada seccao so fica activa quando a anterior esta concluida

**Passo 1 -- Carregue seu arquivo**
- Titulo com numero circulado: "(1) Carregue seu arquivo"
- Subtitulo: "Selecione um arquivo que contenha seus contatos para importacao."
- Link "Baixe um arquivo de exemplo (.csv)" que gera e descarrega um CSV de exemplo com colunas Nome, Email, Telefone, Empresa
- Zona de drag & drop grande (como no Brevo): borda tracejada, icone de upload, texto "Selecione seu arquivo ou arraste e solte aqui" + formatos aceites (.csv, .xlsx ou .txt)
- Apos upload: banner verde "Seu arquivo foi carregado." com nome do ficheiro e botao "Cancelar" para remover
- Tabela de preview com as primeiras 10 linhas do ficheiro (mostra TODAS as colunas do ficheiro, nao so as mapeadas)
- Botao "Confirme seu arquivo" para avancar

**Passo 2 -- Mapeamento de dados**
- Titulo: "(2) Mapeamento de dados"
- Subtitulo: "Selecione o atributo de contato que corresponde aos seus dados."
- Layout em cards/rows como no Brevo:
  - Cada coluna do ficheiro e um card com fundo claro
  - Lado esquerdo: nome do cabecalho do ficheiro (bold) + preview de 3 valores daquela coluna
  - Lado direito: dropdown para selecionar o atributo do sistema (Nome, Email, Telefone, Empresa, ou "Ignorar")
  - Icone verde de check quando mapeado, cinza quando ignorado
- Footer do step: "Para importacao X colunas, Ignorado Y coluna" + botao "Redefinir mapeamento" + botao "Confirmar o mapeamento"
- Auto-mapping inteligente mantido (detecta headers similares)

**Passo 3 -- Selecionar uma lista**
- Titulo: "(3) Selecionar uma lista"
- Duas tabs: "Selecionar uma lista" | "Criar uma lista"
- Tab "Selecionar":
  - Barra de pesquisa
  - Tabela com colunas: checkbox, ID (sequencial), Nome da lista, N. de contactos, Criada em
  - Selecao por checkbox (single select)
  - Footer: "X lista selecionada" + botao "Confirmar sua lista"
- Tab "Criar":
  - Campo "Nome da lista"
  - Campo "Descricao" (opcional)
  - Botao "Criar e selecionar"

**Passo 4 -- Finalize sua importacao**
- Titulo: "(4) Finalize sua importacao"
- Seccao "Gerenciamento de contatos":
  - Switch "Atualizar os atributos existentes de contatos" (se email ja existe, atualiza nome/telefone/empresa)
  - Sub-switch "Importar campos vazios para apagar dados de atributos existentes" (desativado por defeito)
- Seccao "Certificacao Opt-in":
  - Checkbox obrigatorio: "Certifico que os novos contatos importados atendem a estas condicoes:"
  - Lista de bullet points:
    - "Os meus contactos concordaram em receber campanhas por email ou WhatsApp"
    - "Estes contactos nao foram obtidos de terceiros"
    - "Estes contactos nao foram comprados ou alugados"
- Botao "Confirme sua importacao" (desativado ate aceitar opt-in)
- Barra de progresso durante importacao
- Ecra de resultado apos conclusao (mantido: novos, existentes, erros)

---

### 2. Logica de importacao (melhorias)

- **Atualizar existentes**: quando o switch esta ativo e o email ja existe no CRM, fazer UPDATE em vez de skip
- **Download de exemplo**: gerar CSV com headers "Nome,Email,Telefone,Empresa" e 2 linhas de exemplo
- **Preview 10 linhas**: mostrar tabela com TODAS as colunas do ficheiro (nao so as 4 do sistema)

---

### 3. Ficheiros a editar

| Acao | Ficheiro |
|------|----------|
| Reescrever | `src/components/marketing/ImportContactsModal.tsx` |

Nenhum outro ficheiro precisa de alteracao -- a modal ja e chamada correctamente pela pagina `Lists.tsx`.

---

### Detalhes tecnicos

- Usar `Sheet` (do shadcn) em vez de `Dialog` para ter o painel lateral full-height
- Manter a biblioteca `xlsx` para parsing
- Manter a logica de batch upsert de 100 em 100 para `client_list_members`
- Estado do stepper: array de booleans `[step1Done, step2Done, step3Done]` que controla quais seccoes estao expandidas/clicaveis
- Cada seccao usa `Collapsible` ou logica condicional para expandir/colapsar
- Mobile-first: em ecras pequenos o sheet ocupa 100% da largura
