

## Reatribuir venda 020 à Ana Calado + corrigir matching do ficheiro

### 1) Reatribuir venda 020 (PRIMAVERA) para Ana Calado

A venda 020 está atribuída ao Nuno Dias (`5a03aa42-...`). Será reatribuída à Ana Calado (`f96eca52-5546-45d5-839b-bb2a255f9549`).

Atualizar em cascata (conforme política existente):
- `sales.created_by` → Ana Calado
- `crm_clients.assigned_to` do cliente PRIMAVERA → Ana Calado
- `leads.assigned_to` da lead associada (se houver) → Ana Calado
- `proposals.created_by` das propostas do cliente → Ana Calado
- `calendar_events.user_id` dos eventos do cliente → Ana Calado

Executado via tool de insert/update (não é migration, é dados).

### 2) Investigar e corrigir matching do ficheiro importado

Das 8 linhas importadas, 7 deram "CPE não encontrado". Preciso verificar:
- Se os CPEs do ficheiro existem na tabela `cpes` do sistema
- Se a normalização está correcta (a função `normalize_chargeback_cpe` remove tudo exceto A-Z0-9)
- Se o problema é que os CPEs não estão registados como equipamento dos clientes

Vou cruzar os CPEs importados com os CPEs existentes no sistema para identificar a causa exacta.

### Ficheiros alterados
Nenhum ficheiro de código — apenas dados no banco.

