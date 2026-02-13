
# Modulo de Listas de Transmissao no Marketing

## Resumo
Criar um novo modulo "Listas" dentro do Marketing Hub que permite gerir listas de contactos reutilizaveis, com importacao de ficheiros XLSX/CSV atraves de um wizard de 4 passos.

As tabelas `client_lists` e `client_list_members` ja existem na base de dados com RLS configurado -- vamos apenas construir o frontend.

---

## 1. Novos Ficheiros

### Pagina: `src/pages/marketing/Lists.tsx`
- Header com botao "Nova Lista" e "Importar Contactos"
- Tabela/cards com listas existentes: Nome, Descricao, N. de contactos, Data de criacao
- Clique numa lista abre modal de detalhe com membros
- Acoes: editar nome, eliminar lista

### Hook: `src/hooks/useContactLists.ts`
- CRUD completo sobre `client_lists` e `client_list_members`
- Criar lista, adicionar/remover membros, eliminar lista
- Query com contagem de membros por lista
- Listar membros de uma lista com join a `crm_clients`

### Componente: `src/components/marketing/ContactListsTable.tsx`
- Tabela responsiva (cards em mobile)
- Colunas: Nome, Descricao, Contactos, Criado em
- Badge com contagem de membros
- Botoes de acao (ver, editar, eliminar)

### Componente: `src/components/marketing/CreateListModal.tsx`
- Formulario simples: Nome + Descricao
- Opcao de adicionar contactos manualmente (selecao do CRM, reutilizando logica existente)

### Componente: `src/components/marketing/ListDetailsModal.tsx`
- Info da lista (nome, descricao, total)
- Tabela dos membros com nome, email, telefone
- Botao para adicionar mais contactos do CRM
- Botao para remover contacto da lista

### Componente: `src/components/marketing/ImportContactsModal.tsx`
Wizard de 4 passos:

**Step 1 - Carregar Arquivo**
- Drag & drop ou botao para selecionar ficheiro
- Aceita .xlsx, .xls e .csv
- Preview do nome do ficheiro e tamanho
- Usa a biblioteca `xlsx` (ja instalada) para ler o ficheiro

**Step 2 - Mapear Campos**
- Mostra as colunas detetadas no ficheiro (headers)
- Para cada coluna do sistema (Nome, Email, Telefone, Empresa), dropdown para selecionar a coluna correspondente do ficheiro
- Preview das primeiras 3-5 linhas mapeadas
- Campo "Nome" obrigatorio, "Email" recomendado

**Step 3 - Selecionar ou Criar Lista**
- Dropdown com listas existentes
- Botao "Criar nova lista" com campo de nome inline
- Opcao de adicionar a uma lista existente ou criar nova

**Step 4 - Finalizar Importacao**
- Resumo: X contactos a importar, para a lista Y
- Botao "Importar"
- Barra de progresso durante a importacao
- Os contactos sao criados na tabela `crm_clients` (se nao existirem por email) e adicionados a `client_list_members`
- Ecra de sucesso com contagem de importados / duplicados / erros

---

## 2. Alteracoes em Ficheiros Existentes

### `src/pages/Marketing.tsx`
- Adicionar card "Listas" com icone `Users` (lucide) e link para `/marketing/lists`

### `src/App.tsx`
- Adicionar rota `/marketing/lists` apontando para o novo componente

### `src/components/marketing/CreateCampaignModal.tsx`
- No Step 2 (selecao de destinatarios), adicionar uma terceira tab "Por Lista" que permite selecionar uma lista de transmissao existente e carregar os seus membros automaticamente

---

## 3. Logica de Importacao (detalhe tecnico)

```text
Ficheiro (XLSX/CSV)
  |
  v
xlsx.read() -> worksheet -> JSON array
  |
  v
Mapear colunas (user define: coluna X = nome, coluna Y = email...)
  |
  v
Para cada linha:
  1. Verificar se ja existe crm_client com esse email na org
  2. Se nao existe -> INSERT em crm_clients (source: 'other', status: 'active')
  3. Se ja existe -> reutilizar o client_id existente
  4. INSERT em client_list_members (list_id, client_id) com ON CONFLICT ignorar
```

- Processamento feito em batch no frontend (nao precisa de edge function)
- Limite de 1000 contactos por importacao para performance
- Validacao de emails no frontend antes de inserir

---

## 4. Ficheiros a criar/editar

| Acao | Ficheiro |
|------|----------|
| Criar | `src/pages/marketing/Lists.tsx` |
| Criar | `src/hooks/useContactLists.ts` |
| Criar | `src/components/marketing/ContactListsTable.tsx` |
| Criar | `src/components/marketing/CreateListModal.tsx` |
| Criar | `src/components/marketing/ListDetailsModal.tsx` |
| Criar | `src/components/marketing/ImportContactsModal.tsx` |
| Editar | `src/pages/Marketing.tsx` (adicionar card Listas) |
| Editar | `src/App.tsx` (adicionar rota) |
| Editar | `src/components/marketing/CreateCampaignModal.tsx` (tab "Por Lista") |

Nao sao necessarias alteracoes na base de dados -- as tabelas `client_lists` e `client_list_members` ja existem com RLS.
