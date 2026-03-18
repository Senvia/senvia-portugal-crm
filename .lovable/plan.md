

## Corrigir dados de teste: mover da Senvia para a Perfect2Gether

### O erro
Os 8 conjuntos de dados de teste (propostas + proposal_cpes + vendas) foram criados na organização **Senvia** (`06fe9e1d...`) em vez da **Perfect2Gether** (`96a3950e...`). Os comerciais atribuídos (João Monteiro e Thais Lorraine) também não pertencem à Perfect2Gether.

### Solução

**1. Apagar os dados errados da Senvia** (SQL migration)
- Apagar as 8 vendas criadas por engano
- Apagar os 8 proposal_cpes associados
- Apagar as 8 propostas associadas

IDs das propostas a apagar:
`59fc962d`, `bac0ee48`, `1de764a4`, `985b2611`, `b18aba4c`, `cd3a3653`, `e286e13f`, `4c498d0a`

**2. Criar dados novos na Perfect2Gether** (SQL migration)
- Org: `96a3950e-31be-4c6d-abed-b82968c0d7e9`
- Comerciais da Perfect2Gether (5 membros disponíveis):
  - Admin: `5a03aa42-8282-406e-827f-bedd87615e25`
  - Salesperson: `44a688ac`, `76300665`, `f96eca52`, `f54baad9`
- Usar leads existentes da Perfect2Gether (8 leads disponíveis)
- Distribuir os 8 CPEs aleatoriamente entre os 4 salespersons
- Criar: 8 propostas (`energia`, `accepted`) → 8 proposal_cpes (com os serial_numbers corretos) → 8 vendas (`delivered`)

### Ficheiros alterados
Nenhum — apenas migração SQL (apagar dados errados + inserir dados corretos na org certa)

