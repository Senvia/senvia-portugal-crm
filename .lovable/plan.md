

## Criar Perfil "Diretor Comercial" na Perfect2Gether

### Resumo

Inserir via migracao SQL o perfil "Diretor Comercial" apenas na organizacao **Perfect2Gether** (`96a3950e-31be-4c6d-abed-b82968c0d7e9`), com visao total sobre toda a area comercial.

### Definicao do Perfil

| Campo | Valor |
|-------|-------|
| Nome | Diretor Comercial |
| Role Base | salesperson |
| Visibilidade | all (ve todos os dados da organizacao) |
| Default | false |

### Permissoes Granulares

| Modulo | Sub-area | Acoes |
|--------|----------|-------|
| Leads | Kanban | ver, adicionar, editar, eliminar, atribuir |
| Leads | Exportar | ver, exportar, importar |
| Clientes | Lista | ver, adicionar, editar, eliminar |
| Clientes | Comunicacoes | ver, adicionar |
| Clientes | CPEs | ver, adicionar, editar, eliminar |
| Propostas | Propostas | ver, criar, editar, eliminar, enviar |
| Vendas | Vendas | ver, criar, editar, eliminar |
| Vendas | Pagamentos | ver, adicionar |
| Financas | Resumo | ver |
| Financas | Faturas | ver |
| Financas | Despesas | ver |
| Financas | Pagamentos | ver |
| Financas | Pedidos | ver |
| Agenda | Eventos | ver, criar, editar, eliminar |
| Marketing | Templates | nao |
| E-commerce | * | nao |
| Definicoes | * | nao |

### Implementacao

**1 migracao SQL** que insere o perfil diretamente na organizacao Perfect2Gether com o JSON granular completo e `data_scope = 'all'`.

### Secao Tecnica

A migracao insere um unico registo na tabela `organization_profiles` com:
- `organization_id`: `96a3950e-31be-4c6d-abed-b82968c0d7e9`
- `data_scope`: `all` (visao total, sem filtro por equipa)
- Permissoes completas em leads, clientes, propostas, vendas e agenda
- Financas apenas em modo leitura
- Marketing, e-commerce e definicoes desativados

