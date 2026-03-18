

## Problema

Os 8 itens "não associados" que aparecem são da **importação anterior**, feita antes de adicionarmos o filtro CB. Nessa importação, **todas** as linhas do ficheiro foram tratadas como chargebacks (incluindo pagamentos normais). Esses dados antigos ainda estão na base de dados.

### Solução

**1. Limpar dados da importação anterior (migração SQL)**
- Apagar os registos da tabela `commission_chargeback_items` e `commission_chargeback_imports` que foram importados incorretamente (a importação anterior que incluiu linhas não-CB)

**2. Reimportar o ficheiro**
- Depois de limpar, o utilizador pode reimportar o ficheiro com o filtro CB ativo, e apenas as linhas corretas serão processadas

### Ficheiros a alterar
- Migração SQL para limpar os dados antigos

