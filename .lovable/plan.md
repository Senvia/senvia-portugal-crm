

## Criar vendas de teste com os 8 CPEs não associados

### Contexto
Os 8 CPEs importados não foram encontrados porque não existem propostas/vendas com esses CPEs no sistema. Vou criar dados de teste completos para que o matching funcione na próxima importação.

### Dados a criar (via SQL insert)

Para cada CPE, criar a cadeia completa: **Proposta → proposal_cpe → Venda**

| CPE | Valor CB | Comercial atribuído |
|-----|----------|-------------------|
| PT0002000100723735BE | 10,36€ | João Monteiro |
| PT0002000102974369TZ | 38,12€ | Thais Lorraine |
| PT0002000104382618WL | 5,62€ | João Monteiro |
| PT0002000104989706QE | -71,34€ | Thais Lorraine |
| PT0002000111166209NJ | 165,81€ | João Monteiro |
| PT1601000000461219MK | 147,56€ | Thais Lorraine |
| PT1605000000001772QM | 1021,91€ | João Monteiro |
| PT1605000008089920GL | 243,70€ | Thais Lorraine |

### Passos técnicos

1. **Criar 8 propostas** (tipo `energia`, status `accepted`) — 4 por comercial, usando clientes existentes aleatoriamente
2. **Criar 8 proposal_cpes** com `serial_number` = CPE correspondente, `comercializador` = 'EDP Comercial', `equipment_type` = 'Energia'
3. **Criar 8 vendas** ligadas às propostas, com `created_by` = user_id do comercial, status `delivered`, `proposal_type` = 'energia'

### Organização
- Org ID: `06fe9e1d-9670-45b0-8717-c5a6e90be380`
- João Monteiro: `450648a5-0546-46e6-b333-27f29942a481`
- Thais Lorraine: `67da1542-4444-4f19-a539-d6229c7ca8b8`

### Ficheiros alterados
- Nenhum — apenas inserção de dados via SQL

