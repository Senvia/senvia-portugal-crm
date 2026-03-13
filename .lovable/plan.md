

## Plano: Reverter lead Virgolino Lopes para "na 3"

### Dados encontrados

- **Lead**: `1abfdd5f` — status atual: `won` → reverter para `na 3`
- **Eventos de calendário**: 4 eventos "Recontacto: Virgolino Lopes" → eliminar todos
- **Venda**: `0002` (`bdda2d50`) — status `delivered`, vinculada ao cliente Virgolino → eliminar
- **Cliente CRM**: `4145032e` — "Virgolino Lopes" → eliminar (foi criado na conversão)

### Operações (via insert tool)

1. **Eliminar pagamentos da venda** (se existirem) para evitar erros de FK
2. **Eliminar a venda** `0002`
3. **Eliminar o cliente CRM** Virgolino Lopes
4. **Eliminar os 4 eventos de calendário**
5. **Atualizar o lead** status de `won` → `na 3`

Todas são operações de dados (DELETE/UPDATE), sem alterações de schema.

