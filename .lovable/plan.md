

# Historico de Datas de Ativacao na Venda

## Objetivo
Adicionar um historico de todas as alteracoes da Data de Ativacao na lateral direita dos detalhes da venda, mostrando quando e por quem a data foi alterada.

## Como vai funcionar
- Sempre que o estado da venda for alterado e uma Data de Ativacao for definida/alterada, o sistema regista automaticamente no historico
- Na coluna direita dos detalhes da venda aparece um card "Historico de Ativacao" com uma timeline das datas

## Seccao Tecnica

### 1. Nova tabela na base de dados

Criar a tabela `sale_activation_history`:

```text
sale_activation_history
-----------------------
id              uuid (PK)
organization_id uuid (FK)
sale_id         uuid (FK -> sales.id)
activation_date date
changed_by      uuid (user id)
created_at      timestamptz
notes           text (opcional, ex: "Concluida", "Entregue")
```

Politicas RLS:
- SELECT: membros da organizacao
- INSERT: membros da organizacao

### 2. Novo hook `useSaleActivationHistory`

- Query para buscar o historico de uma venda
- Mutation para inserir novo registo
- Inclui o nome do utilizador via join com `profiles`

### 3. Alteracoes no `SaleDetailsModal.tsx`

- Importar o novo hook
- No momento de `confirmDelivered` e `confirmFulfilled`, alem de atualizar a venda, inserir um registo no historico
- Na coluna direita (RIGHT COLUMN), adicionar um card "Historico de Ativacao" com timeline vertical mostrando:
  - Data de ativacao definida
  - Quem alterou
  - Quando alterou
  - Estado associado (ex: "Entregue", "Concluida")

### 4. Componente visual

Card com timeline simples:
- Icone de calendario
- Cada entrada mostra: data de ativacao, estado, utilizador e timestamp
- Ordenado do mais recente para o mais antigo
- So aparece se houver pelo menos 1 registo

### Ficheiros a criar/editar

1. **Migracao SQL** - criar tabela `sale_activation_history` + RLS
2. **`src/hooks/useSaleActivationHistory.ts`** - novo hook
3. **`src/components/sales/SaleDetailsModal.tsx`** - adicionar historico na lateral direita

