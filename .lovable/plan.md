

# Reestruturar o ClientDetailsDrawer

## Resumo
Reorganizar completamente a coluna esquerda do modal de detalhes do cliente conforme pedido, e adicionar um botao "Voltar" no final da coluna direita.

## Alteracoes em `src/components/clients/ClientDetailsDrawer.tsx`

### 1. Header
- Alterar o titulo de "{client.name}" para **"Detalhes do Cliente #{client.code}"**
- Usar icone `FileText` em vez de `User`

### 2. Coluna Esquerda - Nova estrutura de cards

**Card 1: "Dados do Cliente"** (substitui o card de contexto + card dados + card contacto)
- Codigo: `#{client.code}`
- Nome: `{client.name}`
- NIF: `{client.nif}` (NIF pessoal do cliente)
- Email: com link mailto
- Telefone: com link WhatsApp
- Tipologia/Estado: badge com estilo
- Origem: badge secundario

**Card 2: "Empresa"** (mantém, sempre visivel)
- Nome da empresa: `{client.company}`
- NIF da empresa: `{client.nif}`
- Morada completa (integrada neste card em vez de card separado)

**Card 3: CPE/CUI** (telecom only, sem alteracao)

**Card 4: Notas** (sem alteracao)

**Card 5: Historico** (sem alteracao)

### 3. Coluna Direita - Adicionar botao "Voltar"
- Metricas (sem alteracao)
- Acoes Rapidas (sem alteracao)
- Vendedor Responsavel (sem alteracao)
- Propostas Recentes (sem alteracao)
- Vendas Recentes (sem alteracao)
- **Novo: Botao "Voltar"** no final, que fecha o modal (`onOpenChange(false)`)

### Nota sobre NIF
O modelo `CrmClient` tem apenas um campo `nif`. Sera exibido tanto no card "Dados do Cliente" como no card "Empresa" (quando houver empresa). Se nao existir empresa, o NIF aparece apenas nos dados do cliente.

## Ficheiro alterado
- `src/components/clients/ClientDetailsDrawer.tsx`

